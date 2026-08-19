from fastapi import APIRouter, Depends

from app.auth.deps import get_current_user
from app.services.system_service import get_stats

router = APIRouter()


@router.get("/stats")
async def system_stats(current_user: dict = Depends(get_current_user)):
    """Live CPU, memory, and disk usage for the machine running the backend."""
    return get_stats()
