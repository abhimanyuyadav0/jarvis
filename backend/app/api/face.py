import base64
import io
from fastapi import APIRouter, HTTPException, UploadFile

from app.services.face_service import face_service

router = APIRouter()


@router.post("/analyze")
async def analyze_face(file: UploadFile):
    """Analyze image for faces. Returns face count and locations."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    try:
        data = await file.read()
        result = await face_service.analyze(data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-base64")
async def analyze_face_base64(body: dict):
    """Analyze base64 image for faces."""
    b64 = body.get("image")
    if not b64:
        raise HTTPException(status_code=400, detail="Missing 'image' in body")
    try:
        if "," in b64:
            b64 = b64.split(",")[1]
        data = base64.b64decode(b64)
        result = await face_service.analyze(data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/register")
async def register_face(file: UploadFile, name: str):
    """Register a face with a name for future recognition."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    try:
        data = await file.read()
        await face_service.register(data, name)
        return {"status": "registered", "name": name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recognize")
async def recognize_face(file: UploadFile):
    """Recognize face in image. Returns matched name if known."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    try:
        data = await file.read()
        result = await face_service.recognize(data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
