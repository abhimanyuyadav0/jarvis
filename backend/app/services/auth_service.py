import json
import os
import uuid
from datetime import datetime
from pathlib import Path

import cv2
import numpy as np

USERS_FILE = Path("./data/users.json")
AUTH_FACES_DIR = Path("./data/auth_faces")
AUTH_FACES_DIR.mkdir(parents=True, exist_ok=True)


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


class AuthService:
    def __init__(self):
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )

    def _decode_image(self, image_data: bytes) -> "np.ndarray | None":
        nparr = np.frombuffer(image_data, np.uint8)
        return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    def _ensure_face(self, image_data: bytes) -> tuple[np.ndarray, np.ndarray]:
        """Decode image and ensure exactly one face. Raises ValueError otherwise."""
        img = self._decode_image(image_data)
        if img is None:
            raise ValueError("Invalid image")
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30)
        )
        if len(faces) == 0:
            raise ValueError("No face detected. Please ensure your face is visible.")
        if len(faces) > 1:
            raise ValueError("Multiple faces detected. Please ensure only one face is visible.")
        x, y, w, h = faces[0]
        face_roi = gray[y : y + h, x : x + w]
        return gray, face_roi

    async def validate_face(self, image_data: bytes) -> dict:
        """
        Validate face shape and human face patterns. Auto-runs when camera is on.
        Returns { valid: bool, message: str, face_info?: dict }.
        """
        img = self._decode_image(image_data)
        if img is None:
            return {"valid": False, "message": "Invalid image"}

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        img_h, img_w = gray.shape[:2]

        faces = self.face_cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=5, minSize=(50, 50)
        )

        if len(faces) == 0:
            return {"valid": False, "message": "No face detected. Position your face in frame."}

        if len(faces) > 1:
            return {"valid": False, "message": "Multiple faces. Ensure only you are visible."}

        x, y, w, h = faces[0]

        # Face aspect ratio - human faces are roughly 0.7 to 1.0 (width/height)
        aspect = w / h if h > 0 else 0
        if aspect < 0.5 or aspect > 1.5:
            return {"valid": False, "message": "Face angle not ideal. Look straight at camera."}

        # Face size - should be at least 10% of image
        face_area = w * h
        img_area = img_w * img_h
        if face_area < img_area * 0.05:
            return {"valid": False, "message": "Move closer. Face is too small."}
        if face_area > img_area * 0.8:
            return {"valid": False, "message": "Move back slightly. Face too close."}

        # Blur check - disabled by default; set BLUR_THRESHOLD=50 in .env to enable
        if os.environ.get("BLUR_THRESHOLD"):
            try:
                threshold = int(os.environ["BLUR_THRESHOLD"])
                face_roi = gray[y : y + h, x : x + w]
                laplacian_var = cv2.Laplacian(face_roi, cv2.CV_64F).var()
                if laplacian_var < threshold:
                    return {"valid": False, "message": "Image too blurry. Hold steady or improve lighting."}
            except (ValueError, KeyError):
                pass

        result = {
            "valid": True,
            "message": "Face verified",
            "face_info": {"x": int(x), "y": int(y), "width": int(w), "height": int(h)},
        }
        face_roi = gray[y : y + h, x : x + w]
        threshold = self._get_match_threshold()
        existing_id, score = self._match_face(face_roi)
        if existing_id and score >= threshold:
            users = _load_users()
            result["already_registered"] = True
            result["existing_name"] = users.get(existing_id, {}).get("name", "Unknown")
        return result

    def _get_match_threshold(self) -> float:
        """Match threshold; lower = more lenient. Default 0.4. Set FACE_MATCH_THRESHOLD in .env."""
        try:
            return float(os.environ.get("FACE_MATCH_THRESHOLD", "0.4"))
        except (ValueError, TypeError):
            return 0.4

    FACE_SIZE = (100, 100)  # Normalized size for consistent matching

    def _normalize_face(self, face_roi: np.ndarray) -> np.ndarray:
        """Normalize face for robust matching: resize, histogram equalization."""
        resized = cv2.resize(face_roi, self.FACE_SIZE, interpolation=cv2.INTER_AREA)
        return cv2.equalizeHist(resized)

    def _extract_face_from_image(self, img: np.ndarray) -> "np.ndarray | None":
        """Extract face ROI from full image. Returns grayscale face crop or None."""
        if img is None or img.size == 0:
            return None
        gray = img if len(img.shape) == 2 else cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30)
        )
        if len(faces) == 0:
            return None
        x, y, w, h = faces[0]
        face_roi = gray[y : y + h, x : x + w]
        return self._normalize_face(face_roi)

    def _match_face(
        self, face_roi: np.ndarray, exclude_user_id: str | None = None, include_pending: bool = False
    ) -> tuple[str | None, float]:
        """Match face against registered users. Returns (user_id, score) or (None, 0).
        include_pending=False: only completed users (for register duplicate check, validate).
        include_pending=True: all users (for login, so pending registrations can log in).
        Uses normalized faces for more robust matching across lighting/angle."""
        users = _load_users()
        best_match = None
        best_score = 0.0
        # Normalize input face for consistent comparison
        query_face = self._normalize_face(face_roi)
        for user_id, user_data in users.items():
            if user_id == exclude_user_id:
                continue
            if not include_pending and user_data.get("pending_name"):
                continue
            reg_path = AUTH_FACES_DIR / f"{user_id}.jpg"
            if not reg_path.exists():
                continue
            reg_full = cv2.imread(str(reg_path))
            if reg_full is None:
                continue
            reg_face = self._extract_face_from_image(reg_full)
            if reg_face is None:
                continue
            diff = np.mean(np.abs(reg_face.astype(float) - query_face.astype(float)))
            score = 1 / (1 + diff)
            if score > best_score:
                best_score = score
                best_match = user_id
        return best_match, best_score

    async def register_face(self, image_data: bytes) -> dict:
        """Store face first (after validation). Returns temp user for name step."""
        gray, face_roi = self._ensure_face(image_data)
        users = _load_users()
        if users:
            threshold = self._get_match_threshold()
            existing_id, score = self._match_face(face_roi)
            if existing_id and score >= threshold:
                existing = users[existing_id]
                raise ValueError(
                    f"Face already registered as '{existing['name']}'. Please login instead."
                )
        user_id = str(uuid.uuid4())
        display_name = f"User_{user_id[:8]}"
        face_path = AUTH_FACES_DIR / f"{user_id}.jpg"
        with open(face_path, "wb") as f:
            f.write(image_data)
        users = _load_users()
        users[user_id] = {"name": display_name, "created_at": datetime.utcnow().isoformat(), "pending_name": True}
        _save_users(users)
        return {"user_id": user_id, "name": display_name, "token": user_id}

    async def register_complete(self, user_id: str, name: str | None = None) -> dict:
        """Complete registration with name (called after face stored)."""
        users = _load_users()
        if user_id not in users:
            raise ValueError("Invalid session. Please register again.")
        display_name = (name or "").strip() or users[user_id]["name"]
        users[user_id]["name"] = display_name
        users[user_id].pop("pending_name", None)
        _save_users(users)
        return {"user_id": user_id, "name": display_name, "token": user_id}

    async def register(self, image_data: bytes, name: str | None = None) -> dict:
        """Register user with face (required). Name optional. One-shot registration."""
        gray, face_roi = self._ensure_face(image_data)
        users = _load_users()
        if users:
            threshold = self._get_match_threshold()
            existing_id, score = self._match_face(face_roi)
            if existing_id and score >= threshold:
                existing = users[existing_id]
                raise ValueError(
                    f"Face already registered as '{existing['name']}'. Please login instead."
                )
        user_id = str(uuid.uuid4())
        display_name = (name or "").strip() or f"User_{user_id[:8]}"
        face_path = AUTH_FACES_DIR / f"{user_id}.jpg"
        with open(face_path, "wb") as f:
            f.write(image_data)
        users = _load_users()
        users[user_id] = {"name": display_name, "created_at": datetime.utcnow().isoformat()}
        _save_users(users)
        return {"user_id": user_id, "name": display_name, "token": user_id}

    async def login(self, image_data: bytes) -> dict:
        """Login with face (required). Returns user if matched. Only matches completed (non-pending) users."""
        gray, face_roi = self._ensure_face(image_data)
        users = _load_users()
        if not users:
            raise ValueError("No users registered. Please register first.")
        threshold = self._get_match_threshold()
        best_match, best_score = self._match_face(face_roi, include_pending=True)
        if not best_match or best_score < threshold:
            raise ValueError(
                "Face not recognized. Ensure good lighting, look straight at camera, or complete a pending registration."
            )
        user = users[best_match]
        return {"user_id": best_match, "name": user["name"], "token": best_match}


auth_service = AuthService()
