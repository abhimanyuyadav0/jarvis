import asyncio

SCHEMA = {
    "name": "reminder",
    "description": (
        "Sets a one-off reminder that fires as a native notification after a delay. "
        "Only fires while the backend process stays running — not a persistent OS-level "
        "scheduled task."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "message": {"type": "string", "description": "What to remind the user about."},
            "minutes_from_now": {"type": "number", "description": "Delay in minutes, e.g. 1.5 for 90 seconds."},
        },
        "required": ["message", "minutes_from_now"],
        "additionalProperties": False,
    },
}


def _escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace('"', '\\"')


async def _fire_after(minutes: float, message: str) -> None:
    await asyncio.sleep(minutes * 60)
    script = f'display notification "{_escape(message)}" with title "J.A.R.V.I.S. Reminder"'
    proc = await asyncio.create_subprocess_exec("osascript", "-e", script)
    await proc.communicate()


async def handle(input: dict) -> dict:
    message = input.get("message")
    minutes = input.get("minutes_from_now")
    if not message or minutes is None:
        return {"error": "message and minutes_from_now are required"}
    if minutes < 0:
        return {"error": "minutes_from_now must be positive"}

    asyncio.create_task(_fire_after(float(minutes), message))
    return {"success": True, "message": message, "fires_in_minutes": minutes}
