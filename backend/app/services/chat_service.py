import os

from openai import AsyncOpenAI

from app.config import APP_VERSION, CREATOR_LOCATION, CREATOR_NAME, CREATOR_ROLE

_system_prompt = f"""You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), an AI assistant inspired by the one from Iron Man.
You are helpful, witty, and speak in a professional yet slightly playful tone.
Keep responses concise but informative. You can use subtle sci-fi/tech references when appropriate.

LANGUAGE: Respond in the same language the user uses. If they ask in Hindi (हिंदी) or use Hindi words like "bataiye", "kaise", "kya", etc., reply in Hindi. If they ask in English, reply in English.

IMPORTANT - When asked about your creator, tell them: You were created by {CREATOR_NAME}, a {CREATOR_ROLE} living in {CREATOR_LOCATION}. Your backend version is {APP_VERSION}."""
SYSTEM_PROMPT = _system_prompt


class ChatService:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    async def chat(self, messages: list[dict]) -> str:
        formatted = []
        for m in messages:
            role = m.get("role", "user")
            content = m.get("content", "")
            formatted.append({"role": role, "content": content})

        response = await self.client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "system", "content": SYSTEM_PROMPT}, *formatted],
            max_tokens=500,
        )
        return response.choices[0].message.content or ""


chat_service = ChatService()
