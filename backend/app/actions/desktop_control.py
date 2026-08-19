import asyncio
from pathlib import Path

from send2trash import send2trash

SCHEMA = {
    "name": "desktop_control",
    "description": "Controls the Desktop: get/set the wallpaper, list files on it, or organize loose files into subfolders by type.",
    "input_schema": {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "enum": ["get_wallpaper", "set_wallpaper", "list", "organize", "clean"],
            },
            "path": {
                "type": "string",
                "description": "Image file path, used with set_wallpaper.",
            },
        },
        "required": ["action"],
        "additionalProperties": False,
    },
}

_DESKTOP = Path.home() / "Desktop"
_JUNK_SUFFIXES = (".tmp", ".download", ".crdownload", ".part")
_CATEGORY_EXTS = {
    "Images": {".png", ".jpg", ".jpeg", ".gif", ".webp", ".heic", ".svg"},
    "Documents": {".pdf", ".doc", ".docx", ".txt", ".md", ".pages", ".rtf"},
    "Spreadsheets": {".xls", ".xlsx", ".csv", ".numbers"},
    "Archives": {".zip", ".tar", ".gz", ".rar", ".7z"},
}


async def _osascript(script: str) -> tuple[int, str, str]:
    proc = await asyncio.create_subprocess_exec(
        "osascript", "-e", script,
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
    )
    out, err = await proc.communicate()
    return proc.returncode, out.decode().strip(), err.decode().strip()


async def handle(input: dict) -> dict:
    action = input.get("action")

    if action == "get_wallpaper":
        code, out, err = await _osascript(
            'tell application "System Events" to get picture of current desktop'
        )
        if code != 0:
            return {"error": err or "Could not read wallpaper"}
        return {"wallpaper": out}

    if action == "set_wallpaper":
        path = input.get("path")
        if not path or not Path(path).expanduser().exists():
            return {"error": "path must point to an existing image file"}
        resolved = str(Path(path).expanduser().resolve())
        code, _, err = await _osascript(
            f'tell application "System Events" to set picture of current desktop to "{resolved}"'
        )
        if code != 0:
            return {"error": err or "Could not set wallpaper"}
        return {"success": True, "wallpaper": resolved}

    if action == "list":
        if not _DESKTOP.exists():
            return {"files": []}
        files = [
            {"name": p.name, "size_bytes": p.stat().st_size, "is_dir": p.is_dir()}
            for p in sorted(_DESKTOP.iterdir())
            if not p.name.startswith(".")
        ]
        return {"files": files, "count": len(files)}

    if action == "organize":
        if not _DESKTOP.exists():
            return {"error": "Desktop folder not found"}
        moved = []
        for p in list(_DESKTOP.iterdir()):
            if p.is_dir() or p.name.startswith("."):
                continue
            category = next(
                (cat for cat, exts in _CATEGORY_EXTS.items() if p.suffix.lower() in exts),
                "Other",
            )
            dest_dir = _DESKTOP / category
            dest_dir.mkdir(exist_ok=True)
            dest = dest_dir / p.name
            if not dest.exists():
                p.rename(dest)
                moved.append(f"{p.name} -> {category}/")
        return {"success": True, "moved": moved, "count": len(moved)}

    if action == "clean":
        if not _DESKTOP.exists():
            return {"error": "Desktop folder not found"}
        removed = []
        for p in list(_DESKTOP.iterdir()):
            if p.is_file() and (p.name == ".DS_Store" or p.suffix.lower() in _JUNK_SUFFIXES):
                send2trash(str(p))
                removed.append(p.name)
        return {"success": True, "removed_to_trash": removed, "count": len(removed)}

    return {"error": f"Unknown action: {action}"}
