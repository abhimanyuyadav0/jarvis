from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

from app.services.tts_service import synthesize_speech

router = APIRouter()


class TTSRequest(BaseModel):
    text: str
    gender: str = "male"


@router.post("")
async def text_to_speech(body: TTSRequest):
    text = body.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")
    try:
        audio = await synthesize_speech(text, body.gender)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"TTS unavailable. Install edge-tts: pip install edge-tts ({exc})",
        ) from exc
    return Response(content=audio, media_type="audio/mpeg")
