import asyncio
import base64
from io import BytesIO

SCHEMA = {
    "name": "vision",
    "description": (
        "Capture the screen or the webcam and look at it. This is the only way you can "
        "actually see anything — use it whenever asked what's on screen, what you see, "
        "to read something visible, or to describe the camera view."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "source": {
                "type": "string",
                "enum": ["screen", "camera"],
                "description": "'screen' to capture the display, 'camera' for the webcam.",
            },
        },
        "required": ["source"],
        "additionalProperties": False,
    },
}

_MAX_DIMENSION = 1568
_JPEG_QUALITY = 85


def _capture_screen():
    import pyautogui

    return pyautogui.screenshot()


def _capture_camera():
    import cv2
    from PIL import Image

    cap = cv2.VideoCapture(0)
    try:
        if not cap.isOpened():
            raise RuntimeError("No camera available or camera access denied.")
        ok, frame = cap.read()
        if not ok or frame is None:
            raise RuntimeError("Could not read a frame from the camera.")
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        return Image.fromarray(rgb)
    finally:
        cap.release()


def _encode(img) -> str:
    img = img.convert("RGB")
    img.thumbnail((_MAX_DIMENSION, _MAX_DIMENSION))
    buf = BytesIO()
    img.save(buf, format="JPEG", quality=_JPEG_QUALITY)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


async def handle(input: dict) -> dict:
    source = input.get("source")
    if source not in ("screen", "camera"):
        return {"error": "source must be 'screen' or 'camera'"}

    try:
        capture = _capture_screen if source == "screen" else _capture_camera
        img = await asyncio.to_thread(capture)
        b64 = await asyncio.to_thread(_encode, img)
    except Exception as e:
        hint = (
            " This likely needs Screen Recording permission (for screen) or Camera "
            "permission (for camera) granted to the backend's process in System "
            "Settings > Privacy & Security."
        )
        return {"error": f"{e}.{hint}"}

    return {
        "__content_blocks__": [
            {
                "type": "image",
                "source": {"type": "base64", "media_type": "image/jpeg", "data": b64},
            },
            {"type": "text", "text": f"Captured from {source}."},
        ]
    }
