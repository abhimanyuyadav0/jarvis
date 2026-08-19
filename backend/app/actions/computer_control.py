import asyncio
import time
from pathlib import Path

SCHEMA = {
    "name": "computer_control",
    "description": (
        "Direct mouse, keyboard, and clipboard control: type text, click, move the mouse, "
        "press hotkeys, scroll, take a screenshot, or read/write the clipboard. Requires "
        "Accessibility and Screen Recording permissions granted to the backend process. "
        "Tell the user what you're about to do before using this."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "enum": [
                    "type", "click", "double_click", "right_click", "move",
                    "hotkey", "press", "scroll", "screenshot", "clipboard_copy", "clipboard_paste",
                ],
            },
            "text": {"type": "string", "description": "Text to type or copy to clipboard."},
            "x": {"type": "integer"},
            "y": {"type": "integer"},
            "keys": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Key combo for hotkey, e.g. ['command', 'c'].",
            },
            "key": {"type": "string", "description": "Single key name, for press."},
            "direction": {"type": "string", "enum": ["down", "up"]},
            "amount": {"type": "integer", "description": "Scroll amount, default 5."},
        },
        "required": ["action"],
        "additionalProperties": False,
    },
}

_SCREENSHOT_DIR = Path(__file__).resolve().parents[2] / "data" / "screenshots"


def _permission_hint(e: Exception) -> str:
    return (
        f"{e}. This likely needs Accessibility (and Screen Recording, for screenshots) "
        "permission granted to the backend's process in System Settings > Privacy & Security."
    )


async def handle(input: dict) -> dict:
    import pyautogui
    import pyperclip

    action = input.get("action")

    try:
        if action == "type":
            text = input.get("text", "")
            await asyncio.to_thread(pyautogui.typewrite, text, interval=0.02)
            return {"success": True}

        if action in ("click", "double_click", "right_click", "move"):
            x, y = input.get("x"), input.get("y")
            if x is None or y is None:
                return {"error": "x and y are required"}
            fn = {
                "click": pyautogui.click,
                "double_click": pyautogui.doubleClick,
                "right_click": pyautogui.rightClick,
                "move": pyautogui.moveTo,
            }[action]
            await asyncio.to_thread(fn, x, y)
            return {"success": True}

        if action == "hotkey":
            keys = input.get("keys") or []
            if not keys:
                return {"error": "keys is required"}
            await asyncio.to_thread(pyautogui.hotkey, *keys)
            return {"success": True}

        if action == "press":
            key = input.get("key")
            if not key:
                return {"error": "key is required"}
            await asyncio.to_thread(pyautogui.press, key)
            return {"success": True}

        if action == "scroll":
            amount = input.get("amount", 5)
            clicks = amount if input.get("direction", "down") == "up" else -amount
            await asyncio.to_thread(pyautogui.scroll, clicks)
            return {"success": True}

        if action == "screenshot":
            _SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
            path = _SCREENSHOT_DIR / f"screen_{int(time.time())}.png"
            img = await asyncio.to_thread(pyautogui.screenshot)
            img.save(str(path))
            return {"success": True, "path": str(path)}

        if action == "clipboard_copy":
            text = input.get("text", "")
            await asyncio.to_thread(pyperclip.copy, text)
            return {"success": True}

        if action == "clipboard_paste":
            text = await asyncio.to_thread(pyperclip.paste)
            return {"clipboard": text}

        return {"error": f"Unknown action: {action}"}
    except Exception as e:
        return {"error": _permission_hint(e)}
