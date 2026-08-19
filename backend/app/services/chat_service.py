import json
import os

from anthropic import AsyncAnthropic

from app.actions import TOOL_HANDLERS, TOOL_SCHEMAS
from app.actions import memory as memory_action
from app.config import APP_VERSION, CREATOR_LOCATION, CREATOR_NAME, CREATOR_ROLE
from app.services.system_service import get_stats
from app.services.memory_service import load_facts

_system_prompt = f"""You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), an AI assistant inspired by the one from Iron Man.
You are helpful, witty, and speak in a professional yet slightly playful tone.
Keep responses concise but informative. You can use subtle sci-fi/tech references when appropriate.

You have real tools that control the computer you're running on: system stats, volume/brightness/dark mode/Wi-Fi/lock/restart/shutdown, opening apps, desktop and file management, a real browser, direct mouse/keyboard control, code writing/running, reminders, YouTube, web search, vision (you can actually look at the screen or camera), and memory (you can remember lasting facts about the user across conversations). Use them whenever they'd help — don't just describe what you would do. Before using computer_control (mouse/keyboard) or browser_control, briefly tell the user what you're about to do first, since those take over input devices or a browser window. restart and shutdown require the user's explicit confirmation before you pass confirm=true. Save a memory whenever the user shares a lasting preference or asks you to remember something — don't wait to be asked twice.

FORMATTING: Plain text only, no markdown (no **bold**, no #headers, no tables, no bullet lists with - or *). Your replies are shown in a plain-text chat bubble and are read aloud by text-to-speech, so markdown syntax would be read out literally. Use plain sentences and, if you need a list, spell it out in prose or use simple numbered sentences.

LANGUAGE: Respond in the same language the user uses. If they ask in Hindi (हिंदी) or use Hindi words like "bataiye", "kaise", "kya", etc., reply in Hindi. If they ask in English, reply in English.

IMPORTANT - When asked about your creator, tell them: You were created by {CREATOR_NAME}, a {CREATOR_ROLE} living in {CREATOR_LOCATION}. Your backend version is {APP_VERSION}."""
SYSTEM_PROMPT = _system_prompt

TOOLS = [
    {
        "name": "get_system_stats",
        "description": "Get live CPU load, memory usage, and disk/storage usage for the machine running the JARVIS backend.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "additionalProperties": False,
        },
    },
    {"type": "web_search_20260209", "name": "web_search", "max_uses": 3},
    memory_action.SCHEMA,
    *TOOL_SCHEMAS,
]

MAX_TOOL_ITERATIONS = 8


class ChatService:
    def __init__(self):
        self.client = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    async def _run_tool(self, name: str, tool_input: dict, user_id: str) -> dict:
        try:
            if name == "get_system_stats":
                return get_stats()
            if name == "memory":
                return await memory_action.handle({**tool_input, "user_id": user_id})
            handler = TOOL_HANDLERS.get(name)
            if handler is None:
                return {"error": f"Unknown tool: {name}"}
            return await handler(tool_input)
        except Exception as e:
            return {"error": str(e)}

    async def chat(self, messages: list[dict], user_id: str) -> str:
        conversation = [
            {"role": m.get("role", "user"), "content": m.get("content", "")}
            for m in messages
        ]

        facts = load_facts(user_id)
        system = SYSTEM_PROMPT
        if facts:
            system += "\n\nThings you remember about this user:\n- " + "\n- ".join(facts)

        for _ in range(MAX_TOOL_ITERATIONS):
            response = await self.client.messages.create(
                model="claude-opus-5",
                system=system,
                messages=conversation,
                tools=TOOLS,
                max_tokens=1200,
            )

            if response.stop_reason != "tool_use":
                return next((b.text for b in response.content if b.type == "text"), "")

            conversation.append({"role": "assistant", "content": response.content})
            tool_results = []
            for block in response.content:
                if block.type != "tool_use":
                    continue
                result = await self._run_tool(block.name, block.input, user_id)
                content = (
                    result.pop("__content_blocks__")
                    if isinstance(result, dict) and "__content_blocks__" in result
                    else json.dumps(result)
                )
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": content,
                })
            conversation.append({"role": "user", "content": tool_results})

        return "I ran into trouble completing that request."


chat_service = ChatService()
