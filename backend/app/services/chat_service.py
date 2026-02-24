import os

from openai import AsyncOpenAI

SYSTEM_PROMPT = """You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), Tony Stark's AI assistant from Iron Man.
You are helpful, witty, and speak in a professional yet slightly playful tone.
Keep responses concise but informative. You can use subtle sci-fi/tech references when appropriate."""


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
