from fastapi import APIRouter, Depends, HTTPException
from openai import APIConnectionError, AuthenticationError, RateLimitError

from app.auth.deps import get_current_user
from app.config import OPENAI_API_KEY
from app.services.chat_service import chat_service

router = APIRouter()


@router.post("/message")
async def chat_message(
    messages: list[dict],
    current_user: dict = Depends(get_current_user),
):
    """Send messages to JARVIS and get AI response."""
    if not OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="OpenAI API key not configured. Set OPENAI_API_KEY in .env",
        )
    try:
        response = await chat_service.chat(messages)
        return {"content": response}
    except RateLimitError:
        raise HTTPException(
            status_code=429,
            detail="OpenAI quota exceeded. Add billing or credits at platform.openai.com.",
        )
    except AuthenticationError:
        raise HTTPException(
            status_code=401,
            detail="Invalid OpenAI API key. Check OPENAI_API_KEY in backend/.env.",
        )
    except APIConnectionError:
        raise HTTPException(
            status_code=503,
            detail="Could not reach OpenAI. Check your network connection and try again.",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
