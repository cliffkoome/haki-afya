from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    assert client.get("/api/health").json() == {"ok": True}


def test_classify_care_need():
    r = client.post("/api/care-need/classify", json={"text": "Mke wangu anakaribia kujifungua", "lang": "sw"})
    assert r.status_code == 200
    assert set(r.json()) == {"service_category", "is_emergency", "matched_by"}


def test_facilities_requires_valid_service_category():
    r = client.get("/api/facilities", params={"service_category": "dentistry", "lat": -1.29, "lng": 36.82})
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "invalid_request"


def test_facilities():
    r = client.get("/api/facilities", params={"service_category": "maternity", "lat": -1.29, "lng": 36.82})
    assert r.status_code == 200
    facility = r.json()["facilities"][0]
    assert {"id", "distance_km", "coverage", "benefit_summary", "is_demo"} <= set(facility)


def test_facility_search():
    r = client.get("/api/facilities/search", params={"q": "demo"})
    assert r.status_code == 200
    assert "facilities" in r.json()


def _bill_form(**overrides):
    form = {"registered": "true", "referral": "neither", "device_id": "test-device", "facility_id": "d001"}
    form.update(overrides)
    return form


def test_bill_check_ok():
    r = client.post("/api/bill-check", data=_bill_form(), files={"image": ("bill.jpg", b"fake", "image/jpeg")})
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert {f["flag"] for f in body["flags"]} <= {"should_be_free", "above_tariff", "payable", "unclear"}


def test_bill_check_retake_mock():
    r = client.post("/api/bill-check?mock=retake", data=_bill_form(),
                    files={"image": ("bill.jpg", b"fake", "image/jpeg")})
    assert r.json()["status"] == "retake"


def test_bill_check_needs_facility_or_level():
    form = _bill_form()
    del form["facility_id"]
    r = client.post("/api/bill-check", data=form, files={"image": ("bill.jpg", b"fake", "image/jpeg")})
    assert r.status_code == 422


def test_create_report():
    r = client.post("/api/reports", json={
        "facility_id": "d001", "service_category": "maternity",
        "paid": True, "amount_kes": 5000, "device_id": "test-device",
    })
    assert r.status_code == 201
    assert r.json()["verified"] is False
