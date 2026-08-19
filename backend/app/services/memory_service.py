import json
from pathlib import Path

MEMORY_DIR = Path("./data/memory")
MAX_FACTS = 100


def _path(user_id: str) -> Path:
    return MEMORY_DIR / f"{user_id}.json"


def load_facts(user_id: str) -> list[str]:
    path = _path(user_id)
    if not path.exists():
        return []
    with open(path) as f:
        return json.load(f).get("facts", [])


def _save_facts(user_id: str, facts: list[str]) -> None:
    MEMORY_DIR.mkdir(parents=True, exist_ok=True)
    with open(_path(user_id), "w") as f:
        json.dump({"facts": facts}, f, indent=2)


def add_fact(user_id: str, fact: str) -> list[str]:
    facts = load_facts(user_id)
    fact = fact.strip()
    if fact and fact not in facts:
        facts.append(fact)
        facts = facts[-MAX_FACTS:]
        _save_facts(user_id, facts)
    return facts


def remove_fact(user_id: str, fact: str) -> tuple[list[str], bool]:
    facts = load_facts(user_id)
    fact_lower = fact.strip().lower()
    remaining = [f for f in facts if fact_lower not in f.lower()]
    removed = len(remaining) != len(facts)
    if removed:
        _save_facts(user_id, remaining)
    return remaining, removed
