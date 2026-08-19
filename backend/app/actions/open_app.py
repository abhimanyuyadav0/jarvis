import asyncio
import re

SCHEMA = {
    "name": "open_app",
    "description": (
        "Opens an application on the computer by name, or a URL in the default browser. "
        "Always call this when the user asks to open, launch, or start an app or website."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "app_name": {
                "type": "string",
                "description": "Exact or common app name (e.g. 'Chrome', 'VS Code', 'Spotify'), or a URL.",
            },
        },
        "required": ["app_name"],
        "additionalProperties": False,
    },
}

ALIASES = {
    "chrome": "Google Chrome",
    "google chrome": "Google Chrome",
    "vscode": "Visual Studio Code",
    "vs code": "Visual Studio Code",
    "code": "Visual Studio Code",
    "whatsapp": "WhatsApp",
    "spotify": "Spotify",
    "terminal": "Terminal",
    "textedit": "TextEdit",
    "text edit": "TextEdit",
    "calculator": "Calculator",
    "safari": "Safari",
    "mail": "Mail",
    "notes": "Notes",
    "finder": "Finder",
    "slack": "Slack",
    "discord": "Discord",
    "figma": "Figma",
    "zoom": "zoom.us",
    "calendar": "Calendar",
    "messages": "Messages",
    "music": "Music",
    "preview": "Preview",
    "photoshop": "Adobe Photoshop",
}

_URL_RE = re.compile(r"^https?://", re.IGNORECASE)


async def _shell(*args: str) -> tuple[int, str, str]:
    proc = await asyncio.create_subprocess_exec(
        *args, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
    )
    out, err = await proc.communicate()
    return proc.returncode, out.decode().strip(), err.decode().strip()


async def handle(input: dict) -> dict:
    app_name = (input.get("app_name") or "").strip()
    if not app_name:
        return {"error": "app_name is required"}

    if _URL_RE.match(app_name) or (" " not in app_name and "." in app_name and "/" not in app_name):
        url = app_name if _URL_RE.match(app_name) else f"https://{app_name}"
        code, _, err = await _shell("open", url)
        if code != 0:
            return {"error": err or f"Could not open {url}"}
        return {"success": True, "opened_url": url}

    resolved = ALIASES.get(app_name.lower(), app_name)
    code, _, err = await _shell("open", "-a", resolved)
    if code != 0:
        return {"error": err or f"Could not find or open app '{resolved}'"}
    return {"success": True, "opened_app": resolved}
