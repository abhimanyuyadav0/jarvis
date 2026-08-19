from importlib import import_module
from typing import Awaitable, Callable

_MODULE_NAMES = [
    "computer_settings",
    "open_app",
    "desktop_control",
    "file_controller",
    "browser_control",
    "computer_control",
    "code_helper",
    "reminder",
    "youtube_video",
    "vision",
]

TOOL_SCHEMAS: list[dict] = []
TOOL_HANDLERS: dict[str, Callable[[dict], Awaitable[dict]]] = {}

for _name in _MODULE_NAMES:
    _mod = import_module(f"app.actions.{_name}")
    TOOL_SCHEMAS.append(_mod.SCHEMA)
    TOOL_HANDLERS[_mod.SCHEMA["name"]] = _mod.handle
