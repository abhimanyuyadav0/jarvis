import io
import os
from pathlib import Path

import cv2
import numpy as np

FACES_DIR = Path("./data/faces")
FACES_DIR.mkdir(parents=True, exist_ok=True)


class FaceService:
    def __init__(self):
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        self.known_faces: dict[str, list] = {}

    async def analyze(self, image_data: bytes) -> dict:
        """Detect faces in image. Returns count and bounding boxes."""
        nparr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return {"face_count": 0, "faces": []}

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30)
        )

        result = []
        for (x, y, w, h) in faces:
            result.append({"x": int(x), "y": int(y), "width": int(w), "height": int(h)})

        return {"face_count": len(result), "faces": result}

    async def register(self, image_data: bytes, name: str) -> None:
        """Store face image for later recognition."""
        path = FACES_DIR / f"{name}.jpg"
        with open(path, "wb") as f:
            f.write(image_data)

    async def recognize(self, image_data: bytes) -> dict:
        """Simple recognition: compare with registered faces. Returns best match."""
        if not list(FACES_DIR.glob("*.jpg")):
            return {"recognized": False, "name": None}

        nparr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return {"recognized": False, "name": None}

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30)
        )

        if len(faces) == 0:
            return {"recognized": False, "name": None, "face_count": 0}

        # Simple template matching - crop first face and compare with registered
        x, y, w, h = faces[0]
        face_roi = gray[y : y + h, x : x + w]

        best_match = None
        best_score = 0

        for reg_path in FACES_DIR.glob("*.jpg"):
            reg_img = cv2.imread(str(reg_path), cv2.IMREAD_GRAYSCALE)
            if reg_img is None:
                continue
            reg_img = cv2.resize(reg_img, (face_roi.shape[1], face_roi.shape[0]))
            score = np.mean(np.abs(reg_img.astype(float) - face_roi.astype(float)))
            score = 1 / (1 + score)
            if score > best_score:
                best_score = score
                best_match = reg_path.stem

        return {
            "recognized": best_score > 0.6,
            "name": best_match,
            "confidence": round(float(best_score), 2),
            "face_count": len(faces),
        }


face_service = FaceService()
