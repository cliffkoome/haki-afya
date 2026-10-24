"""Gemma client JSON handling with a fake client: no network calls."""

import asyncio
from types import SimpleNamespace

import pytest

from app import gemma


class FakeModels:
    def __init__(self, replies):
        self.replies = list(replies)
        self.calls = 0

    async def generate_content(self, **kwargs):
        self.calls += 1
        return SimpleNamespace(text=self.replies.pop(0))


@pytest.fixture
def fake(monkeypatch):
    def install(*replies):
        models = FakeModels(replies)
        monkeypatch.setattr(gemma, "_client", SimpleNamespace(aio=SimpleNamespace(models=models)))
        return models
    return install


def test_json_in_code_fences(fake):
    fake('```json\n{"service_category": "maternity", "is_emergency": false}\n```')
    result = asyncio.run(gemma.classify_care_need("x", "en"))
    assert result.service_category == "maternity"


def test_retries_once_on_invalid_json(fake):
    models = fake("not json", '{"service_category": "imaging", "is_emergency": false}')
    assert asyncio.run(gemma.classify_care_need("x", "en")).service_category == "imaging"
    assert models.calls == 2


def test_fails_after_two_invalid_replies(fake):
    fake("nope", '{"service_category": "dentistry"}')
    with pytest.raises(gemma.GemmaError):
        asyncio.run(gemma.classify_care_need("x", "en"))


def test_model_emergency_is_normalised(fake):
    fake('{"service_category": "maternity", "is_emergency": true}')
    result = asyncio.run(gemma.classify_care_need("x", "en"))
    assert result.service_category == "emergency" and result.is_emergency


def test_prompts_fill_every_placeholder():
    for name, values in {
        "classify_care_need": {"care_need": "x", "language": "English"},
        "extract_bill": {},
        "write_dispute": {"language": "English", "facility": "{}", "registered": "yes", "flags": "[]", "sha_contacts": "[]"},
    }.items():
        assert "{{" not in gemma.prompt(name, **values)
