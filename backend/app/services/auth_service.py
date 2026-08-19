import json
import re
import uuid
from datetime import datetime
from pathlib import Path

import bcrypt

USERS_FILE = Path("./data/users.json")

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_LENGTH = 72  # bcrypt silently truncates beyond this; reject instead


def _load_users() -> dict:
    if not USERS_FILE.exists():
        USERS_FILE.parent.mkdir(parents=True, exist_ok=True)
        return {}
    with open(USERS_FILE) as f:
        return json.load(f)


def _save_users(users: dict) -> None:
    USERS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(USERS_FILE, "w") as f:
        json.dump(users, f, indent=2)


def _find_by_email(users: dict, email: str) -> tuple[str, dict] | None:
    for user_id, data in users.items():
        if data.get("email", "").lower() == email.lower():
            return user_id, data
    return None


class AuthService:
    async def register(self, email: str, password: str, name: str | None = None) -> dict:
        email = (email or "").strip().lower()
        if not EMAIL_RE.match(email):
            raise ValueError("Enter a valid email address.")
        if not password or len(password) < MIN_PASSWORD_LENGTH:
            raise ValueError(f"Password must be at least {MIN_PASSWORD_LENGTH} characters.")
        if len(password.encode("utf-8")) > MAX_PASSWORD_LENGTH:
            raise ValueError(f"Password must be at most {MAX_PASSWORD_LENGTH} characters.")

        users = _load_users()
        if _find_by_email(users, email):
            raise ValueError("An account with this email already exists. Please login instead.")

        user_id = str(uuid.uuid4())
        password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        display_name = (name or "").strip() or email.split("@")[0]
        users[user_id] = {
            "email": email,
            "password_hash": password_hash,
            "name": display_name,
            "created_at": datetime.utcnow().isoformat(),
        }
        _save_users(users)
        return {"user_id": user_id, "name": display_name, "token": user_id}

    async def login(self, email: str, password: str) -> dict:
        email = (email or "").strip().lower()
        if not email or not password:
            raise ValueError("Email and password are required.")

        users = _load_users()
        match = _find_by_email(users, email)
        if not match:
            raise ValueError("Invalid email or password.")
        user_id, data = match

        if not bcrypt.checkpw(password.encode("utf-8"), data["password_hash"].encode("utf-8")):
            raise ValueError("Invalid email or password.")

        return {"user_id": user_id, "name": data.get("name", "User"), "token": user_id}


auth_service = AuthService()
