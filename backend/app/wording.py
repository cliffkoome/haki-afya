"""Code checks on text Gemma writes, before a User sees it.

A Desk Script or Complaint Draft that accuses anyone, or contains a number
that was not in what we gave Gemma, is dropped (the Flags still show).
"""

import re

BANNED = (
    # English
    "illegal", "unlawful", "fraud", "overcharg", "scam", "cheat", "steal", "stole", "theft", "rip off", "rip-off",
    # Swahili
    "ulaghai", "udanganyifu", "wizi", "kinyume cha sheria", "haramu", "kudanganya", "tapeli", "matapeli",
)

_NUMBER = re.compile(r"\d[\d,]*(?:\.\d+)?")


def numbers_in(text: str) -> set[int]:
    found = set()
    for m in _NUMBER.findall(text):
        try:
            found.add(round(float(m.replace(",", ""))))
        except ValueError:
            pass
    return found


def problems(text: str, allowed_numbers: set[int]) -> list[str]:
    """Return what is wrong with the text; empty means it may be shown.

    allowed_numbers: every number in the input Gemma was given (Flags, totals, SHA contacts).
    """
    lower = text.lower()
    issues = [f"banned word {w!r}" for w in BANNED if w in lower]
    # Small numbers (Levels, "3 sentences", "24 hours") are fine; amounts must be ones we supplied.
    unknown = {n for n in numbers_in(text) if n >= 100 and n not in allowed_numbers}
    if unknown:
        issues.append(f"numbers not in the input: {sorted(unknown)}")
    return issues
