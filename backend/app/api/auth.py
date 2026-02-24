import base64

from fastapi import APIRouter, HTTPException

from app.services.auth_service import auth_service

router = APIRouter()


@router.post("/validate")
async def validate_face(body: dict):
    """Validate face shape and human patterns. Used during registration before storing."""
    image_b64 = body.get("image")
    if not image_b64:
        raise HTTPException(status_code=400, detail="Face image is required")
    try:
        if "," in image_b64:
            image_b64 = image_b64.split(",")[1]
        data = base64.b64decode(image_b64)
        result = await auth_service.validate_face(data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/register-face")
async def register_face(body: dict):
    """Store face after validation. Returns temp user. Then call register-complete with name."""
    image_b64 = body.get("image")
    if not image_b64:
        raise HTTPException(status_code=400, detail="Face image is required")
    try:
        if "," in image_b64:
            image_b64 = image_b64.split(",")[1]
        data = base64.b64decode(image_b64)
        result = await auth_service.register_face(data)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/register-complete")
async def register_complete(body: dict):
    """Complete registration with name (after face stored)."""
    user_id = body.get("user_id")
    name = body.get("name")
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    try:
        result = await auth_service.register_complete(user_id, name)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/register")
async def register(body: dict):
    """Register with face (required) and optional name. One-shot (legacy)."""
    image_b64 = body.get("image")
    name = body.get("name")
    if not image_b64:
        raise HTTPException(status_code=400, detail="Face image is required")
    try:
        if "," in image_b64:
            image_b64 = image_b64.split(",")[1]
        data = base64.b64decode(image_b64)
        result = await auth_service.register(data, name)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/login")
async def login(body: dict):
    """Login with face (required)."""
    image_b64 = body.get("image")
    if not image_b64:
        raise HTTPException(status_code=400, detail="Face image is required")
    try:
        if "," in image_b64:
            image_b64 = image_b64.split(",")[1]
        data = base64.b64decode(image_b64)
        result = await auth_service.login(data)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
