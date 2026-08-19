from fastapi import APIRouter, HTTPException

from app.services.auth_service import auth_service

router = APIRouter()


@router.post("/register")
async def register(body: dict):
    """Register a new account with email and password."""
    email = body.get("email")
    password = body.get("password")
    name = body.get("name")
    try:
        result = await auth_service.register(email, password, name)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login")
async def login(body: dict):
    """Login with email and password."""
    email = body.get("email")
    password = body.get("password")
    try:
        result = await auth_service.login(email, password)
        return result
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
