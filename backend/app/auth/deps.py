"""Auth dependencies for protected routes."""
import json
from pathlib import Path

from fastapi import Header, HTTPException

USERS_FILE = Path("./data/users.json")


def _load_users() -> dict:
    if not USERS_FILE.exists():
        return {}
    with open(USERS_FILE) as f:
        return json.load(f)


async def get_current_user(
    authorization: str | None = Header(None),
    x_user_token: str | None = Header(None, alias="X-User-Token"),
) -> dict:
    """Extract and validate auth token. Returns user dict or raises 401."""
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:].strip()
    if not token and x_user_token:
        token = x_user_token.strip()

    if not token:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Provide Authorization: Bearer <token> or X-User-Token header.",
        )

    users = _load_users()
    if token not in users:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

    user = users[token]
    if user.get("pending_name"):
        raise HTTPException(status_code=401, detail="Registration incomplete. Complete registration first.")

    return {"user_id": token, "name": user.get("name", "User"), "token": token}
