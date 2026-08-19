from fastapi import APIRouter

from app.services import wake_service

router = APIRouter()


@router.post("/enable")
async def enable_wake():
    """Start background wake-word listening (opt-in, off by default)."""
    return await wake_service.enable()


@router.post("/disable")
async def disable_wake():
    return await wake_service.disable()


@router.get("/status")
async def wake_status():
    return {"enabled": wake_service.is_enabled()}
