import shutil
from pathlib import Path

from send2trash import send2trash

SCHEMA = {
    "name": "file_controller",
    "description": (
        "Manages files and folders, confined to the user's home directory: list, create, "
        "delete (moves to Trash, reversible), move, copy, rename, read, write, and find by name pattern."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "enum": [
                    "list", "create_file", "create_folder", "delete",
                    "move", "copy", "rename", "read", "write", "find",
                ],
            },
            "path": {"type": "string", "description": "Path, absolute or relative to home (~)."},
            "destination": {"type": "string", "description": "Destination path, for move/copy."},
            "new_name": {"type": "string", "description": "New name, for rename."},
            "content": {"type": "string", "description": "Content to write, for write/create_file."},
            "mode": {
                "type": "string",
                "enum": ["overwrite", "append"],
                "description": "Write mode, defaults to overwrite.",
            },
            "pattern": {"type": "string", "description": "Glob pattern, for find (e.g. '*.pdf')."},
        },
        "required": ["action"],
        "additionalProperties": False,
    },
}

_HOME = Path.home().resolve()
_PROTECTED_TOP_LEVEL = {"Desktop", "Documents", "Downloads", "Pictures", "Music", "Movies", "Library"}
_MAX_READ_BYTES = 50_000
_MAX_FIND_RESULTS = 50


def _safe_path(raw: str | None) -> Path | None:
    """Resolve a user-supplied path and reject anything outside the home tree."""
    if not raw:
        return None
    try:
        resolved = Path(raw).expanduser().resolve()
    except (OSError, RuntimeError):
        return None
    if resolved != _HOME and _HOME not in resolved.parents:
        return None
    return resolved


def _is_protected(path: Path) -> bool:
    return path.parent == _HOME and path.name in _PROTECTED_TOP_LEVEL


async def handle(input: dict) -> dict:
    action = input.get("action")

    if action == "list":
        target = _safe_path(input.get("path")) or _HOME
        if not target.exists() or not target.is_dir():
            return {"error": "Not a valid directory"}
        entries = [
            {"name": p.name, "is_dir": p.is_dir(), "size_bytes": p.stat().st_size if p.is_file() else None}
            for p in sorted(target.iterdir())
            if not p.name.startswith(".")
        ]
        return {"path": str(target), "entries": entries, "count": len(entries)}

    if action == "create_file":
        target = _safe_path(input.get("path"))
        if not target:
            return {"error": "path is required and must be inside the home directory"}
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(input.get("content") or "")
        return {"success": True, "path": str(target)}

    if action == "create_folder":
        target = _safe_path(input.get("path"))
        if not target:
            return {"error": "path is required and must be inside the home directory"}
        target.mkdir(parents=True, exist_ok=True)
        return {"success": True, "path": str(target)}

    if action == "delete":
        target = _safe_path(input.get("path"))
        if not target or not target.exists():
            return {"error": "path not found"}
        if _is_protected(target) or target == _HOME:
            return {"error": "Refusing to delete a protected top-level folder"}
        send2trash(str(target))
        return {"success": True, "moved_to_trash": str(target)}

    if action in ("move", "copy"):
        src = _safe_path(input.get("path"))
        dest = _safe_path(input.get("destination"))
        if not src or not src.exists() or not dest:
            return {"error": "path and destination are required and must exist / be inside home"}
        dest.parent.mkdir(parents=True, exist_ok=True)
        if action == "move":
            shutil.move(str(src), str(dest))
        else:
            if src.is_dir():
                shutil.copytree(str(src), str(dest))
            else:
                shutil.copy2(str(src), str(dest))
        return {"success": True, "path": str(dest)}

    if action == "rename":
        src = _safe_path(input.get("path"))
        new_name = input.get("new_name")
        if not src or not src.exists() or not new_name:
            return {"error": "path and new_name are required"}
        dest = src.parent / new_name
        src.rename(dest)
        return {"success": True, "path": str(dest)}

    if action == "read":
        target = _safe_path(input.get("path"))
        if not target or not target.is_file():
            return {"error": "path not found or not a file"}
        data = target.read_text(errors="replace")[:_MAX_READ_BYTES]
        return {"path": str(target), "content": data, "truncated": len(data) >= _MAX_READ_BYTES}

    if action == "write":
        target = _safe_path(input.get("path"))
        if not target:
            return {"error": "path is required and must be inside the home directory"}
        target.parent.mkdir(parents=True, exist_ok=True)
        mode = "a" if input.get("mode") == "append" else "w"
        with open(target, mode) as f:
            f.write(input.get("content") or "")
        return {"success": True, "path": str(target)}

    if action == "find":
        base = _safe_path(input.get("path")) or _HOME
        pattern = input.get("pattern") or "*"
        if not base.is_dir():
            return {"error": "path is not a directory"}
        matches = []
        for p in base.rglob(pattern):
            if any(part.startswith(".") for part in p.relative_to(base).parts):
                continue
            matches.append(str(p))
            if len(matches) >= _MAX_FIND_RESULTS:
                break
        return {"matches": matches, "count": len(matches), "truncated": len(matches) >= _MAX_FIND_RESULTS}

    return {"error": f"Unknown action: {action}"}
