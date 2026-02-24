from fastapi import APIRouter, HTTPException

from app.config import OPENAI_API_KEY
from app.services.chat_service import chat_service

router = APIRouter()


@router.post("/message")
async def chat_message(messages: list[dict]):
    """Send messages to JARVIS and get AI response."""
    if not OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="OpenAI API key not configured. Set OPENAI_API_KEY in .env",
        )
    try:
        response = await chat_service.chat(messages)
        return {"content": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
