"""Gemma 4 through the Gemini API (document.md section 7, "Gemma usage").

Gemma reads and writes; it never decides a Flag. Every call asks for JSON
only, is validated with Pydantic, retried once on invalid JSON or a 5xx from
the API, and times out after 20 s. Thinking is set to minimal: these are
short, well-specified tasks, and default thinking made calls take 20-55 s.
Callers handle GemmaError by failing gracefully.
"""

import asyncio
import json
import logging
import os
import re
from pathlib import Path

from google import genai
from google.genai import errors, types
from pydantic import BaseModel, ValidationError

from app.models import ExtractedBill, Lang, ServiceCategory

log = logging.getLogger(__name__)

# gemma-4-26b-a4b-it (mixture-of-experts, ~4B active) read the SAMPLE Bills as accurately as
# gemma-4-31b-it in a third of the time; the 31B model kept missing the 20 s timeout.
MODEL = os.environ.get("GEMMA_MODEL") or "gemma-4-26b-a4b-it"
TIMEOUT_S = 20
PROMPTS_DIR = Path(__file__).resolve().parents[1] / "prompts"
LANGUAGE_NAME = {"en": "English", "sw": "Swahili"}

_client: genai.Client | None = None


class GemmaError(Exception):
    pass


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        key = os.environ.get("GEMINI_API_KEY")
        if not key:
            raise GemmaError("GEMINI_API_KEY is not set")
        _client = genai.Client(api_key=key, http_options=types.HttpOptions(timeout=TIMEOUT_S * 1000))
    return _client


def prompt(name: str, **values: str) -> str:
    """Load backend/prompts/<name>.md and fill {{placeholders}}."""
    text = (PROMPTS_DIR / f"{name}.md").read_text(encoding="utf-8")
    for key, value in values.items():
        text = text.replace("{{" + key + "}}", value)
    return text


def _json_text(text: str) -> str:
    """Take the JSON object out of a reply that may wrap it in ``` fences or prose."""
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip())
    start, end = text.find("{"), text.rfind("}")
    return text[start:end + 1] if start != -1 and end > start else text


async def _generate_json[T: BaseModel](contents: list, schema: type[T]) -> T:
    client = _get_client()
    config = types.GenerateContentConfig(
        temperature=0, thinking_config=types.ThinkingConfig(thinking_level="MINIMAL"),
    )
    for attempt in (1, 2):
        try:
            response = await asyncio.wait_for(
                client.aio.models.generate_content(model=MODEL, contents=contents, config=config),
                timeout=TIMEOUT_S,
            )
        except errors.ServerError as e:  # 5xx from the API is usually transient
            log.warning("Gemma server error (attempt %d): %s", attempt, e)
            continue
        except Exception as e:  # timeout, network, quota, bad request: no time for a second try
            raise GemmaError(f"Gemma call failed: {e!r}") from e
        try:
            return schema.model_validate_json(_json_text(response.text or ""))
        except ValidationError as e:
            log.warning("Gemma returned invalid JSON (attempt %d): %s", attempt, e)
    raise GemmaError("Gemma failed twice (server error or invalid JSON)")


class CareNeedResult(BaseModel):
    service_category: ServiceCategory | None = None
    is_emergency: bool = False


async def classify_care_need(text: str, lang: Lang) -> CareNeedResult:
    result = await _generate_json(
        [prompt("classify_care_need", care_need=json.dumps(text, ensure_ascii=False), language=LANGUAGE_NAME[lang])],
        CareNeedResult,
    )
    if result.is_emergency or result.service_category == "emergency":
        return CareNeedResult(service_category="emergency", is_emergency=True)
    if result.service_category is None:
        raise GemmaError("Gemma returned no Service Category")
    return result


async def extract_bill(image: bytes, mime_type: str) -> ExtractedBill:
    """The image goes to Gemma in memory only; nothing here keeps it."""
    return await _generate_json(
        [types.Part.from_bytes(data=image, mime_type=mime_type), prompt("extract_bill")],
        ExtractedBill,
    )


class Dispute(BaseModel):
    desk_script: str
    complaint_draft: str


async def write_dispute(*, facility: dict, flags: list[dict], sha_contacts: list[dict],
                        registered: bool, lang: Lang) -> Dispute:
    text = prompt(
        "write_dispute",
        language=LANGUAGE_NAME[lang],
        facility=json.dumps(facility, ensure_ascii=False),
        registered="yes" if registered else "no",
        flags=json.dumps(flags, ensure_ascii=False, indent=1),
        sha_contacts=json.dumps(sha_contacts, ensure_ascii=False, indent=1),
    )
    return await _generate_json([text], Dispute)
