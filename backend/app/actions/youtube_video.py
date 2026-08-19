import asyncio
import os
import re
from urllib.parse import quote_plus

from anthropic import AsyncAnthropic

SCHEMA = {
    "name": "youtube_video",
    "description": "Plays a YouTube search in the browser, or summarizes a YouTube video's transcript.",
    "input_schema": {
        "type": "object",
        "properties": {
            "action": {"type": "string", "enum": ["play", "summarize"]},
            "query": {"type": "string", "description": "Search query, for the play action."},
            "video_url": {"type": "string", "description": "Video URL or ID, for summarize."},
        },
        "required": ["action"],
        "additionalProperties": False,
    },
}

_ID_RE = re.compile(r"(?:v=|youtu\.be/|embed/)([A-Za-z0-9_-]{11})")


def _extract_video_id(raw: str) -> str | None:
    match = _ID_RE.search(raw)
    if match:
        return match.group(1)
    if re.fullmatch(r"[A-Za-z0-9_-]{11}", raw):
        return raw
    return None


async def handle(input: dict) -> dict:
    action = input.get("action")

    if action == "play":
        query = input.get("query")
        if not query:
            return {"error": "query is required"}
        url = f"https://www.youtube.com/results?search_query={quote_plus(query)}"
        proc = await asyncio.create_subprocess_exec("open", url)
        await proc.communicate()
        return {"success": True, "opened_url": url}

    if action == "summarize":
        raw = input.get("video_url")
        if not raw:
            return {"error": "video_url is required"}
        video_id = _extract_video_id(raw)
        if not video_id:
            return {"error": "Could not extract a video ID from that URL"}

        try:
            from youtube_transcript_api import YouTubeTranscriptApi
        except ImportError:
            return {"error": "youtube-transcript-api is not installed"}

        try:
            transcript = await asyncio.to_thread(
                YouTubeTranscriptApi().fetch, video_id
            )
            text = " ".join(snippet.text for snippet in transcript)
        except Exception as e:
            return {"error": f"Could not fetch transcript: {e}"}

        client = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        response = await client.messages.create(
            model="claude-opus-5",
            max_tokens=600,
            system="Summarize this video transcript concisely in plain text, no markdown.",
            messages=[{"role": "user", "content": text[:20000]}],
        )
        summary = next((b.text for b in response.content if b.type == "text"), "")
        return {"video_id": video_id, "summary": summary}

    return {"error": f"Unknown action: {action}"}
