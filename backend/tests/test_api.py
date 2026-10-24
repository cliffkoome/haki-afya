"""API tests against the section 9 contract. Gemma is replaced with fakes: no network calls."""

import pytest

from app import gemma
from app.models import ExtractedBill
from tests.test_rules import BILL_1

IMAGE = {"image": ("bill.jpg", b"fake", "image/jpeg")}


def _fake(result):
    async def fake(*args, **kwargs):
        if isinstance(result, Exception):
            raise result
        return result
    return fake


@pytest.fixture
def gemma_ok(monkeypatch):
    monkeypatch.setattr(gemma, "extract_bill", _fake(BILL_1))
    monkeypatch.setattr(gemma, "write_dispute", _fake(gemma.Dispute(
        desk_script="Hello, I am registered with SHA. SHA pays KES 3,360 per ward day. Could you explain these charges?",
        complaint_draft="To: SHA (test@example.test)\nI was charged KES 15,000 and KES 5,000 per day.",
    )))


def test_health(client):
    assert client.get("/api/health").json() == {"ok": True}


# --- classify ----------------------------------------------------------------

def test_classify_emergency_keywords_skip_gemma(client, monkeypatch):
    monkeypatch.setattr(gemma, "classify_care_need", _fake(AssertionError("Gemma must not be called")))
    for text in ("My father has CHEST PAIN", "Mtoto hawezi kupumua", "she can’t breathe"):
        r = client.post("/api/care-need/classify", json={"text": text, "lang": "en"})
        assert r.json() == {"service_category": "emergency", "is_emergency": True, "matched_by": "keywords"}


def test_classify_model(client, monkeypatch):
    monkeypatch.setattr(gemma, "classify_care_need", _fake(gemma.CareNeedResult(service_category="maternity")))
    r = client.post("/api/care-need/classify", json={"text": "Mke wangu anakaribia kujifungua", "lang": "sw"})
    assert r.json() == {"service_category": "maternity", "is_emergency": False, "matched_by": "model"}


def test_classify_fallback(client, monkeypatch):
    monkeypatch.setattr(gemma, "classify_care_need", _fake(gemma.GemmaError("down")))
    r = client.post("/api/care-need/classify", json={"text": "something", "lang": "en"})
    assert r.json() == {"service_category": None, "is_emergency": False, "matched_by": "fallback"}


# --- facilities ----------------------------------------------------------------

def test_facilities_requires_valid_service_category(client):
    r = client.get("/api/facilities", params={"service_category": "dentistry", "lat": -1.29, "lng": 36.82})
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "invalid_request"


def test_facilities_sorted_by_distance_within_15_km(client):
    r = client.get("/api/facilities", params={"service_category": "maternity", "lat": -1.2676, "lng": 36.8108})
    assert r.status_code == 200
    facilities = r.json()["facilities"]
    # d003 is in Kisumu (too far); d004 has no coordinates.
    assert [f["id"] for f in facilities] == ["d002", "d001"]
    assert facilities[0]["distance_km"] < facilities[1]["distance_km"]
    d001 = facilities[1]
    assert d001["is_demo"] is True and d001["google"] is None
    assert "Test note for normal_delivery." in d001["benefit_summary"]
    # The 2020 demo report is outside the 90-day window.
    assert d001["coverage"] == {"window_days": 90, "verified_paid": 1, "verified_free": 0,
                                "unverified_paid": 1, "unverified_free": 1}


def test_facility_search_contracted_facility(client):
    # Dots join ("t.z." == "tz"), words match by prefix in any order, case does not matter.
    for q in ("tz test", "T.Z. Test", "referral tes"):
        found = client.get("/api/facilities/search", params={"q": q}).json()["facilities"]
        assert [f["id"] for f in found] == ["sha-test-1"], q
    assert found[0] == {
        "id": "sha-test-1", "name": "T.Z. TEST REFERRAL HOSPITAL LIMITED", "level": 6, "is_demo": False,
        "contracted": True, "contracted_checked_on": "2026-10-24",
        "sha_level": "Level 6B", "type": "SPECIALIZED HOSPITAL", "sub_county": "Westlands",
        "coverage": {"window_days": 90, "verified_paid": 0, "verified_free": 0, "unverified_paid": 0, "unverified_free": 0},
    }


def test_facility_search_demo_facility_is_not_contracted(client):
    found = client.get("/api/facilities/search", params={"q": "demo clinic"}).json()["facilities"]
    assert [(f["id"], f["contracted"], f["is_demo"]) for f in found] == [("d002", False, True)]


def test_facility_search_not_on_the_list(client):
    assert client.get("/api/facilities/search", params={"q": "nowhere hospital"}).json() == {"facilities": []}


def test_facility_search_shows_coverage_reports(client):
    client.post("/api/reports", json={"facility_id": "sha-test-1", "service_category": "maternity", "paid": True,
                                      "amount_kes": 5000, "device_id": "search-test"})
    params = {"q": "tz test"}
    assert client.get("/api/facilities/search", params=params).json()["facilities"][0]["coverage"]["unverified_paid"] == 1
    params["service_category"] = "dialysis"
    assert client.get("/api/facilities/search", params=params).json()["facilities"][0]["coverage"]["unverified_paid"] == 0


def test_areas(client):
    assert client.get("/api/areas").json()["areas"][0]["id"] == "kilimani"


# --- bill check ----------------------------------------------------------------

def _bill_form(**overrides):
    form = {"registered": "true", "referral": "referred", "device_id": "test-device", "facility_id": "d001"}
    form.update(overrides)
    return {k: v for k, v in form.items() if v is not None}


def test_bill_check_ok(client, gemma_ok):
    r = client.post("/api/bill-check", data=_bill_form(), files=IMAGE)
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["facility"] == {"id": "d001", "name": "Demo Hospital Kilimani", "level": 4}
    assert [f["flag"] for f in body["flags"]] == ["should_be_free", "above_tariff", "payable"]
    assert body["summary"] == {"amount_in_question_kes": 18280, "balance_kes": 25800}
    assert body["desk_script"].startswith("Hello")
    assert body["complaint_draft"].startswith("To: SHA")
    assert body["verified_report_saved"] is True
    assert body["disclaimer"]
    assert "service_category" not in body["flags"][0]
    assert set(body) == {"status", "facility", "bill", "flags", "summary", "desk_script", "complaint_draft",
                         "sha_contacts", "verified_report_saved", "disclaimer"}


def test_bill_check_saves_verified_reports_once_per_30_days(client, gemma_ok):
    client.post("/api/bill-check", data=_bill_form(device_id="once"), files=IMAGE)
    r = client.post("/api/bill-check", data=_bill_form(device_id="once"), files=IMAGE)
    assert r.json()["verified_report_saved"] is False
    coverage = client.get("/api/facilities", params={"service_category": "maternity", "lat": -1.29, "lng": 36.78}
                          ).json()["facilities"][0]["coverage"]
    assert coverage["verified_paid"] == 2  # one demo report + one from this device


def test_bill_check_not_listed_saves_nothing(client, gemma_ok):
    r = client.post("/api/bill-check", data=_bill_form(facility_id=None, facility_level="4"), files=IMAGE)
    body = r.json()
    assert body["facility"] == {"id": None, "name": None, "level": 4}
    assert body["verified_report_saved"] is False


def test_bill_check_drops_dispute_text_that_accuses_or_invents(client, gemma_ok, monkeypatch):
    monkeypatch.setattr(gemma, "write_dispute", _fake(gemma.Dispute(
        desk_script="This charge is illegal.", complaint_draft="Please refund KES 99,999.")))
    body = client.post("/api/bill-check", data=_bill_form(), files=IMAGE).json()
    assert body["status"] == "ok"
    assert body["desk_script"] is None and body["complaint_draft"] is None


def test_bill_check_dispute_failure_still_shows_flags(client, gemma_ok, monkeypatch):
    monkeypatch.setattr(gemma, "write_dispute", _fake(gemma.GemmaError("down")))
    body = client.post("/api/bill-check", data=_bill_form(), files=IMAGE).json()
    assert body["status"] == "ok" and len(body["flags"]) == 3 and body["desk_script"] is None


def test_bill_check_retake_on_bad_read(client, monkeypatch):
    bad = BILL_1.model_copy(update={"subtotal_kes": 99999})
    monkeypatch.setattr(gemma, "extract_bill", _fake(bad))
    r = client.post("/api/bill-check", data=_bill_form(lang="sw"), files=IMAGE)
    assert r.json()["status"] == "retake" and r.json()["reason"] == "totals_mismatch"
    assert r.json()["message"].startswith("Hatukuweza")


def test_bill_check_retake_on_model_error(client, monkeypatch):
    monkeypatch.setattr(gemma, "extract_bill", _fake(gemma.GemmaError("timeout")))
    assert client.post("/api/bill-check", data=_bill_form(), files=IMAGE).json()["reason"] == "model_error"


def test_bill_check_not_a_bill(client, monkeypatch):
    monkeypatch.setattr(gemma, "extract_bill", _fake(ExtractedBill(is_bill=False)))
    assert client.post("/api/bill-check", data=_bill_form(), files=IMAGE).json()["reason"] == "not_a_bill"


def test_bill_check_mock_param(client):
    assert client.post("/api/bill-check?mock=retake", data=_bill_form(), files=IMAGE).json()["status"] == "retake"
    assert client.post("/api/bill-check?mock=ok", data=_bill_form(), files=IMAGE).json()["status"] == "ok"


def test_bill_check_needs_facility_or_level(client):
    r = client.post("/api/bill-check", data=_bill_form(facility_id=None), files=IMAGE)
    assert r.status_code == 422


def test_bill_check_unknown_facility(client):
    r = client.post("/api/bill-check", data=_bill_form(facility_id="nope"), files=IMAGE)
    assert r.status_code == 404 and r.json()["error"]["code"] == "not_found"


def test_bill_check_rejects_non_images_and_large_files(client):
    r = client.post("/api/bill-check", data=_bill_form(), files={"image": ("a.pdf", b"x", "application/pdf")})
    assert r.status_code == 422
    big = {"image": ("bill.jpg", b"x" * (8 * 1024 * 1024 + 1), "image/jpeg")}
    assert client.post("/api/bill-check", data=_bill_form(), files=big).status_code == 413


# --- reports -------------------------------------------------------------------

def _report(**overrides):
    body = {"facility_id": "d001", "service_category": "maternity", "paid": True, "amount_kes": 5000,
            "device_id": "test-device"}
    body.update(overrides)
    return body


def test_create_report_and_rate_limit(client):
    r = client.post("/api/reports", json=_report())
    assert r.status_code == 201
    assert r.json()["verified"] is False and isinstance(r.json()["id"], int)

    r = client.post("/api/reports", json=_report())
    assert r.status_code == 429
    assert r.json() == {"error": {"code": "rate_limited",
                                  "message": "You already reported this facility for this service in the last 30 days."}}

    # Another Service Category or device is fine.
    assert client.post("/api/reports", json=_report(service_category="imaging")).status_code == 201
    assert client.post("/api/reports", json=_report(device_id="other")).status_code == 201


def test_create_report_unknown_facility(client):
    assert client.post("/api/reports", json=_report(facility_id="nope")).status_code == 404
