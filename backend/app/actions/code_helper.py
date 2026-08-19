import asyncio
import os
import tempfile
from pathlib import Path

from anthropic import AsyncAnthropic

SCHEMA = {
    "name": "code_helper",
    "description": "Writes, explains, or runs a short code snippet. Use 'run' only for quick, safe snippets — python, javascript (node), or shell.",
    "input_schema": {
        "type": "object",
        "properties": {
            "action": {"type": "string", "enum": ["write", "explain", "run"]},
            "description": {"type": "string", "description": "What to write, for the write action."},
            "code": {"type": "string", "description": "Code to explain or run."},
            "language": {
                "type": "string",
                "enum": ["python", "javascript", "shell"],
                "description": "Defaults to python.",
            },
        },
        "required": ["action"],
        "additionalProperties": False,
    },
}

_RUNNERS = {
    "python": ("python3", ".py"),
    "javascript": ("node", ".js"),
    "shell": ("bash", ".sh"),
}
_RUN_TIMEOUT = 15


def _client() -> AsyncAnthropic:
    return AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


async def handle(input: dict) -> dict:
    action = input.get("action")
    language = input.get("language", "python")

    if action == "write":
        description = input.get("description")
        if not description:
            return {"error": "description is required"}
        response = await _client().messages.create(
            model="claude-opus-5",
            max_tokens=2000,
            system=f"Write {language} code for the given request. Return only the code, no explanation, no markdown fences.",
            messages=[{"role": "user", "content": description}],
        )
        code = next((b.text for b in response.content if b.type == "text"), "")
        return {"code": code, "language": language}

    if action == "explain":
        code = input.get("code")
        if not code:
            return {"error": "code is required"}
        response = await _client().messages.create(
            model="claude-opus-5",
            max_tokens=1000,
            system="Explain what this code does, concisely, in plain text (no markdown).",
            messages=[{"role": "user", "content": code}],
        )
        explanation = next((b.text for b in response.content if b.type == "text"), "")
        return {"explanation": explanation}

    if action == "run":
        code = input.get("code")
        if not code:
            return {"error": "code is required"}
        if language not in _RUNNERS:
            return {"error": f"Unsupported language: {language}"}
        binary, ext = _RUNNERS[language]
        with tempfile.TemporaryDirectory() as tmp:
            script = Path(tmp) / f"snippet{ext}"
            script.write_text(code)
            try:
                proc = await asyncio.create_subprocess_exec(
                    binary, str(script),
                    stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
                    cwd=tmp,
                )
                out, err = await asyncio.wait_for(proc.communicate(), timeout=_RUN_TIMEOUT)
            except asyncio.TimeoutError:
                proc.kill()
                return {"error": f"Timed out after {_RUN_TIMEOUT}s"}
            except FileNotFoundError:
                return {"error": f"'{binary}' is not installed or not on PATH"}
        return {
            "stdout": out.decode(errors="replace")[:4000],
            "stderr": err.decode(errors="replace")[:2000],
            "return_code": proc.returncode,
        }

    return {"error": f"Unknown action: {action}"}
