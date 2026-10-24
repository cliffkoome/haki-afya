"""Emergency layer 1: keywords from data/emergency_keywords.json, checked in code
before any Gemma call (document.md section 6.1)."""

import re

from app.data import EmergencyKeywords


def _normalise(text: str) -> str:
    text = text.lower().replace("’", "'").replace("‘", "'")
    return re.sub(r"\s+", " ", text).strip()


def is_emergency(text: str, keywords: EmergencyKeywords) -> bool:
    """Check both languages: people mix English and Swahili whatever the UI language."""
    t = _normalise(text)
    return any(_normalise(k) in t for k in (*keywords.en, *keywords.sw) if k.strip())
