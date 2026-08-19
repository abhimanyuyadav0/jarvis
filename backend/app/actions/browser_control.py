import time
from pathlib import Path
from urllib.parse import quote_plus

from playwright.async_api import async_playwright

SCHEMA = {
    "name": "browser_control",
    "description": (
        "Controls a real, persistent Chromium browser for web tasks: navigating, searching, "
        "clicking, typing, reading page text, and screenshots. This is jarvis's own dedicated "
        "browser profile, not the user's personal Chrome — it starts logged out."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "enum": [
                    "go_to", "search", "click", "type", "get_text",
                    "scroll", "back", "forward", "reload", "screenshot", "close",
                ],
            },
            "url": {"type": "string"},
            "query": {"type": "string", "description": "Search query, for the search action."},
            "selector": {
                "type": "string",
                "description": "CSS selector, or visible text to match for click/type (e.g. 'text=Sign in').",
            },
            "text": {"type": "string", "description": "Text to type, for the type action."},
            "direction": {"type": "string", "enum": ["down", "up"]},
        },
        "required": ["action"],
        "additionalProperties": False,
    },
}

_PROFILE_DIR = Path(__file__).resolve().parents[2] / "data" / "browser_profile"
_SCREENSHOT_DIR = Path(__file__).resolve().parents[2] / "data" / "screenshots"

_playwright = None
_context = None
_page = None


async def _ensure_page():
    global _playwright, _context, _page
    if _page is not None:
        return _page
    _PROFILE_DIR.mkdir(parents=True, exist_ok=True)
    _playwright = await async_playwright().start()
    _context = await _playwright.chromium.launch_persistent_context(
        str(_PROFILE_DIR), headless=False, viewport={"width": 1280, "height": 800}
    )
    _page = _context.pages[0] if _context.pages else await _context.new_page()
    return _page


async def handle(input: dict) -> dict:
    action = input.get("action")

    if action == "close":
        global _playwright, _context, _page
        if _context is not None:
            await _context.close()
        if _playwright is not None:
            await _playwright.stop()
        _playwright = _context = _page = None
        return {"success": True, "closed": True}

    try:
        page = await _ensure_page()
    except Exception as e:
        return {"error": f"Could not start browser: {e}"}

    try:
        if action == "go_to":
            url = input.get("url")
            if not url:
                return {"error": "url is required"}
            if not url.startswith(("http://", "https://")):
                url = f"https://{url}"
            await page.goto(url, wait_until="domcontentloaded")
            return {"success": True, "url": page.url, "title": await page.title()}

        if action == "search":
            query = input.get("query")
            if not query:
                return {"error": "query is required"}
            await page.goto(f"https://www.google.com/search?q={quote_plus(query)}", wait_until="domcontentloaded")
            return {"success": True, "url": page.url}

        if action == "click":
            selector = input.get("selector")
            if not selector:
                return {"error": "selector is required"}
            await page.click(selector, timeout=8000)
            return {"success": True}

        if action == "type":
            selector = input.get("selector")
            text = input.get("text", "")
            if not selector:
                return {"error": "selector is required"}
            await page.fill(selector, text, timeout=8000)
            return {"success": True}

        if action == "get_text":
            selector = input.get("selector")
            if selector:
                el = await page.query_selector(selector)
                text = await el.inner_text() if el else ""
            else:
                text = await page.inner_text("body")
            return {"text": text[:4000], "truncated": len(text) > 4000}

        if action == "scroll":
            amount = 600 if input.get("direction", "down") == "down" else -600
            await page.mouse.wheel(0, amount)
            return {"success": True}

        if action == "back":
            await page.go_back()
            return {"success": True, "url": page.url}

        if action == "forward":
            await page.go_forward()
            return {"success": True, "url": page.url}

        if action == "reload":
            await page.reload()
            return {"success": True, "url": page.url}

        if action == "screenshot":
            _SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
            path = _SCREENSHOT_DIR / f"browser_{int(time.time())}.png"
            await page.screenshot(path=str(path))
            return {"success": True, "path": str(path)}

        return {"error": f"Unknown action: {action}"}
    except Exception as e:
        return {"error": str(e)}
