from app.services import memory_service

SCHEMA = {
    "name": "memory",
    "description": (
        "Remember a lasting fact or preference about the user for future conversations, "
        "forget one, or list what's currently remembered. Use 'save' when the user asks "
        "you to remember something or shares a preference worth keeping long-term."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "action": {"type": "string", "enum": ["save", "forget", "list"]},
            "fact": {
                "type": "string",
                "description": "The fact to save, or text to match when forgetting.",
            },
        },
        "required": ["action"],
        "additionalProperties": False,
    },
}


async def handle(input: dict) -> dict:
    user_id = input.get("user_id")
    if not user_id:
        return {"error": "Missing user context"}

    action = input.get("action")

    if action == "save":
        fact = input.get("fact")
        if not fact:
            return {"error": "fact is required"}
        facts = memory_service.add_fact(user_id, fact)
        return {"success": True, "facts": facts}

    if action == "forget":
        fact = input.get("fact")
        if not fact:
            return {"error": "fact is required"}
        facts, removed = memory_service.remove_fact(user_id, fact)
        return {"success": removed, "facts": facts}

    if action == "list":
        return {"facts": memory_service.load_facts(user_id)}

    return {"error": f"Unknown action: {action}"}
