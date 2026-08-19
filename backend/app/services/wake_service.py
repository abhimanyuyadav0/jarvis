import asyncio
import contextlib

import speech_recognition as sr
from fastapi import WebSocket

WAKE_PHRASES = ["hey jarvis", "wake up jarvis", "jarvis wake up"]

_enabled = False
_task: asyncio.Task | None = None
_connections: set[WebSocket] = set()
_recognizer = sr.Recognizer()


def is_enabled() -> bool:
    return _enabled


def register(ws: WebSocket) -> None:
    _connections.add(ws)


def unregister(ws: WebSocket) -> None:
    _connections.discard(ws)


async def _broadcast(message: dict) -> None:
    dead = []
    for ws in list(_connections):
        try:
            await ws.send_json(message)
        except Exception:
            dead.append(ws)
    for ws in dead:
        _connections.discard(ws)


def _listen_once() -> str | None:
    """Blocking: record a few seconds and transcribe. Must run in a thread."""
    try:
        with sr.Microphone() as source:
            audio = _recognizer.listen(source, timeout=5, phrase_time_limit=4)
        return _recognizer.recognize_google(audio).lower()
    except sr.WaitTimeoutError:
        return None
    except sr.UnknownValueError:
        return None
    except Exception:
        return None


async def _listen_loop() -> None:
    while _enabled:
        transcript = await asyncio.to_thread(_listen_once)
        if transcript and any(phrase in transcript for phrase in WAKE_PHRASES):
            await _broadcast({"event": "wake", "transcript": transcript})
        await asyncio.sleep(0.1)


def _check_microphone() -> str | None:
    """Try opening the default mic once. Returns an error message, or None if OK."""
    try:
        with sr.Microphone():
            pass
        return None
    except Exception as e:
        return (
            f"Could not open the microphone: {e}. On macOS this usually means the "
            "backend's process needs Microphone permission in System Settings > "
            "Privacy & Security > Microphone."
        )


async def enable() -> dict:
    global _enabled, _task
    if _enabled:
        return {"enabled": True, "already_running": True}
    error = await asyncio.to_thread(_check_microphone)
    if error:
        return {"enabled": False, "error": error}
    _enabled = True
    _task = asyncio.create_task(_listen_loop())
    return {"enabled": True}


async def disable() -> dict:
    global _enabled, _task
    _enabled = False
    if _task is not None:
        _task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await _task
        _task = None
    return {"enabled": False}
