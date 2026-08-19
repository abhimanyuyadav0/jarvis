import asyncio

SCHEMA = {
    "name": "computer_settings",
    "description": (
        "Controls macOS system settings: volume, brightness, dark mode, Wi-Fi, lock screen, "
        "sleep display, restart, and shutdown. restart and shutdown require confirm=true — "
        "without it, they return a warning instead of acting, so always ask the user to confirm "
        "first and only pass confirm=true after they explicitly agree."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "enum": [
                    "volume_get", "volume_set", "brightness_up", "brightness_down",
                    "dark_mode_on", "dark_mode_off", "wifi_on", "wifi_off",
                    "lock_screen", "sleep_display", "restart", "shutdown",
                ],
            },
            "value": {
                "type": "integer",
                "description": "Volume level 0-100, only used with volume_set.",
            },
            "confirm": {
                "type": "boolean",
                "description": "Must be true to actually run restart or shutdown.",
            },
        },
        "required": ["action"],
        "additionalProperties": False,
    },
}


async def _osascript(script: str) -> tuple[int, str, str]:
    proc = await asyncio.create_subprocess_exec(
        "osascript", "-e", script,
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
    )
    out, err = await proc.communicate()
    return proc.returncode, out.decode().strip(), err.decode().strip()


async def _shell(*args: str) -> tuple[int, str, str]:
    proc = await asyncio.create_subprocess_exec(
        *args, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
    )
    out, err = await proc.communicate()
    return proc.returncode, out.decode().strip(), err.decode().strip()


async def _wifi_device() -> str | None:
    code, out, _ = await _shell("networksetup", "-listallhardwareports")
    lines = out.splitlines()
    for i, line in enumerate(lines):
        if line.strip() == "Hardware Port: Wi-Fi" and i + 1 < len(lines):
            device_line = lines[i + 1].strip()
            if device_line.startswith("Device:"):
                return device_line.split(":", 1)[1].strip()
    return None


async def handle(input: dict) -> dict:
    action = input.get("action")

    if action == "volume_get":
        code, out, err = await _osascript("output volume of (get volume settings)")
        if code != 0:
            return {"error": err or "Could not read volume"}
        return {"volume": int(out)}

    if action == "volume_set":
        value = input.get("value")
        if value is None or not (0 <= int(value) <= 100):
            return {"error": "value must be an integer 0-100"}
        code, _, err = await _osascript(f"set volume output volume {int(value)}")
        if code != 0:
            return {"error": err or "Could not set volume"}
        return {"success": True, "volume": int(value)}

    if action in ("brightness_up", "brightness_down"):
        key_code = 144 if action == "brightness_up" else 145
        code, _, err = await _osascript(
            f'tell application "System Events" to key code {key_code}'
        )
        if code != 0:
            return {
                "error": (
                    "Could not change brightness — this needs Accessibility permission "
                    "granted to the process running the backend, and doesn't work on all "
                    "displays. " + (err or "")
                ).strip()
            }
        return {"success": True}

    if action in ("dark_mode_on", "dark_mode_off"):
        value = "true" if action == "dark_mode_on" else "false"
        code, _, err = await _osascript(
            f'tell application "System Events" to tell appearance preferences to set dark mode to {value}'
        )
        if code != 0:
            return {"error": err or "Could not toggle dark mode"}
        return {"success": True, "dark_mode": value == "true"}

    if action in ("wifi_on", "wifi_off"):
        device = await _wifi_device()
        if not device:
            return {"error": "Could not find the Wi-Fi hardware device"}
        state = "on" if action == "wifi_on" else "off"
        code, _, err = await _shell("networksetup", "-setairportpower", device, state)
        if code != 0:
            return {"error": err or "Could not toggle Wi-Fi"}
        return {"success": True, "wifi": state}

    if action in ("lock_screen", "sleep_display"):
        code, _, err = await _shell("pmset", "displaysleepnow")
        if code != 0:
            return {"error": err or "Could not sleep the display"}
        note = (
            "Display put to sleep. It will show the lock screen on wake if "
            "'require password after sleep' is enabled in Settings."
            if action == "lock_screen"
            else "Display put to sleep."
        )
        return {"success": True, "note": note}

    if action in ("restart", "shutdown"):
        if input.get("confirm") is not True:
            verb = "restart" if action == "restart" else "shut down"
            return {
                "confirmation_required": True,
                "message": f"This will {verb} the computer. Ask the user to confirm, then call again with confirm=true.",
            }
        verb = "restart" if action == "restart" else "shut down"
        code, _, err = await _osascript(f'tell application "System Events" to {verb}')
        if code != 0:
            return {"error": err or f"Could not {verb}"}
        return {"success": True, "action": action}

    return {"error": f"Unknown action: {action}"}
