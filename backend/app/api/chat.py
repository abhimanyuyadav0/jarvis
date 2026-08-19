from fastapi import APIRouter, Depends, HTTPException

from app.auth.deps import get_current_user
from app.config import ANTHROPIC_API_KEY
from app.services.chat_service import chat_service

router = APIRouter()


@router.post("/message")
async def chat_message(
    messages: list[dict],
    current_user: dict = Depends(get_current_user),
):
    """Send messages to JARVIS and get AI response."""
    if not ANTHROPIC_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Anthropic API key not configured. Set ANTHROPIC_API_KEY in .env",
        )
    try:
        response = await chat_service.chat(messages, current_user["user_id"])
        return {"content": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
