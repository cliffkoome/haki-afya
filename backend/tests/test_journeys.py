"""End-to-end User journeys through every endpoint, on the real data/ files.

Gemma is faked (no network): classify answers from a fixed table, extract_bill
returns the scenario named by the uploaded bytes, write_dispute builds text
from the Flags it is given. For the same journeys against real Gemma, see
test_live.py.
"""

import pytest
from fastapi.testclient import TestClient

from app import data, gemma
from app.main import app
from app.models import SERVICE_CATEGORIES, ExtractedBill
from tests.journey_bills import BILLS, extracted

STORE = data.load(data.DEFAULT_DATA_DIR)
AREAS = [(a.name, a.lat, a.lng) for a in STORE.areas]
KILIMANI = next((a.lat, a.lng) for a in STORE.areas if a.id == "kilimani")

CARE_NEEDS = {
    "My wife is about to give birth": "maternity",
    "Mke wangu anakaribia kujifungua": "maternity",
    "My mother needs dialysis twice a week": "dialysis",
    "Mtoto wangu haoni vizuri ubaoni": "eye_care",
    "My father collapsed and is not breathing": "emergency",
}


@pytest.fixture
def journeys(monkeypatch):
    """A client on the real data/, with Gemma replaced by fakes. Yields (client, gemma_calls)."""
    monkeypatch.delenv("HAKI_DATA_DIR", raising=False)
    monkeypatch.delenv("GOOGLE_PLACES_API_KEY", raising=False)
    calls = {"classify": 0, "extract": 0, "dispute": []}

    async def classify(text, lang):
        calls["classify"] += 1
        category = CARE_NEEDS.get(text)
        if category is None:
            raise gemma.GemmaError("fake: unknown text")
        return gemma.CareNeedResult(service_category=category, is_emergency=category == "emergency")

    async def extract(image, mime_type):
        calls["extract"] += 1
        key = image.decode()
        if key == "not_a_bill":
            return ExtractedBill(is_bill=False)
        if key == "model_error":
            raise gemma.GemmaError("fake: Gemma down")
        if key.endswith(":blurry"):
            return extracted(key.removesuffix(":blurry"), confidence=0.4)
        return extracted(key)

    async def dispute(*, facility, flags, sha_contacts, registered, lang):
        calls["dispute"].append(flags)
        first = flags["items"][0]
        total = flags["total_amount_in_question_kes"]
        return gemma.Dispute(
            desk_script=f"SHA Tariff is KES {first['tariff_kes'] or 0:,}; I am charged KES {first['charged_kes']:,}. Could you explain?",
            complaint_draft=f"To: SHA\nFacility: {facility['name']} (Level {facility['level']})\nAmount in question: KES {total:,}",
        )

    monkeypatch.setattr(gemma, "classify_care_need", classify)
    monkeypatch.setattr(gemma, "extract_bill", extract)
    monkeypatch.setattr(gemma, "write_dispute", dispute)
    with TestClient(app) as client:
        yield client, calls


def find(client, category, lat_lng=KILIMANI, lang="en"):
    r = client.get("/api/facilities", params={"service_category": category, "lat": lat_lng[0], "lng": lat_lng[1], "lang": lang})
    assert r.status_code == 200
    return r.json()["facilities"]


def search(client, q, **params):
    r = client.get("/api/facilities/search", params={"q": q, **params})
    assert r.status_code == 200
    return r.json()["facilities"]


def bill_check(client, scenario, *, facility_id="default", level=None, registered=True, referral="referred",
               lang="en", device_id="journey"):
    form = {"registered": str(registered).lower(), "referral": referral, "lang": lang, "device_id": device_id}
    if facility_id == "default":
        facility_id = BILLS[scenario.split(":")[0]][0] if scenario in BILLS or ":" in scenario else "d001"
    if facility_id:
        form["facility_id"] = facility_id
    if level:
        form["facility_level"] = str(level)
    r = client.post("/api/bill-check", data=form, files={"image": ("bill.jpg", scenario.encode(), "image/jpeg")})
    assert r.status_code == 200, r.text
    return r.json()


def flag_types(body):
    return [f["flag"] for f in body["flags"]]


# --- Find ------------------------------------------------------------------------

def test_find_maternity_from_kilimani_tells_the_demo_story(journeys):
    client, _ = journeys
    r = client.post("/api/care-need/classify", json={"text": "Mke wangu anakaribia kujifungua", "lang": "sw"})
    assert r.json() == {"service_category": "maternity", "is_emergency": False, "matched_by": "model"}

    facilities = find(client, "maternity")
    assert [f["distance_km"] for f in facilities] == sorted(f["distance_km"] for f in facilities)
    assert all(f["distance_km"] <= 15 for f in facilities)
    kilimani, kibera = facilities[0], facilities[1]
    assert kilimani["name"] == "Demo Hospital Kilimani" and kilimani["is_demo"]
    assert kilimani["coverage"] == {"window_days": 90, "verified_paid": 4, "verified_free": 1,
                                    "unverified_paid": 2, "unverified_free": 3}
    assert kibera["name"] == "Demo Health Centre Kibera"
    assert kibera["coverage"]["verified_paid"] == 0 and kibera["coverage"]["verified_free"] == 3
    assert "KES 10,000" in kilimani["benefit_summary"] and "KES 30,000" in kilimani["benefit_summary"]
    assert kilimani["google"] is None


def test_find_benefit_summary_follows_lang(journeys):
    client, _ = journeys
    assert find(client, "maternity", lang="sw")[0]["benefit_summary"].startswith("SHA hulipa")
    assert find(client, "maternity", lang="en")[0]["benefit_summary"].startswith("SHA pays")


@pytest.mark.parametrize("area", AREAS, ids=[a[0] for a in AREAS])
def test_find_works_for_every_service_category_from_every_area(journeys, area):
    client, _ = journeys
    _, lat, lng = area
    for category in SERVICE_CATEGORIES:
        assert find(client, category, (lat, lng)), f"no {category} within 15 km of {area[0]}"


def test_find_shows_only_facilities_offering_the_service(journeys):
    client, _ = journeys
    for f in find(client, "dialysis"):
        assert "dialysis" in STORE.facilities[f["id"]].service_categories


def test_find_outside_nairobi_is_empty(journeys):
    client, _ = journeys
    assert find(client, "maternity", (-0.0917, 34.768)) == []  # Kisumu


def test_emergency_journey(journeys):
    client, _ = journeys
    r = client.post("/api/care-need/classify", json={"text": "My father collapsed and is not breathing", "lang": "en"})
    assert r.json() == {"service_category": "emergency", "is_emergency": True, "matched_by": "model"}
    nearest = find(client, "emergency")
    assert nearest and nearest[0]["distance_km"] < 5


def test_classify_falls_back_to_chips_when_gemma_fails(journeys):
    client, calls = journeys
    r = client.post("/api/care-need/classify", json={"text": "something the fake does not know", "lang": "en"})
    assert r.json() == {"service_category": None, "is_emergency": False, "matched_by": "fallback"}
    assert calls["classify"] == 1


def test_classify_validates_input(journeys):
    client, _ = journeys
    assert client.post("/api/care-need/classify", json={"text": "", "lang": "en"}).status_code == 422
    assert client.post("/api/care-need/classify", json={"text": "x" * 501, "lang": "en"}).status_code == 422
    assert client.post("/api/care-need/classify", json={"text": "hi", "lang": "fr"}).status_code == 422


def test_facilities_validates_input(journeys):
    client, _ = journeys
    for params in ({"service_category": "dentistry", "lat": -1.29, "lng": 36.82},
                   {"service_category": "maternity", "lat": 91, "lng": 36.82},
                   {"service_category": "maternity", "lat": -1.29}):
        r = client.get("/api/facilities", params=params)
        assert r.status_code == 422 and r.json()["error"]["code"] == "invalid_request"


def test_areas(journeys):
    client, _ = journeys
    areas = client.get("/api/areas").json()["areas"]
    assert len(areas) == 20
    assert all(set(a) == {"id", "name", "lat", "lng"} for a in areas)


# --- Search: is this facility contracted? ------------------------------------------

@pytest.mark.parametrize("q,name", [
    ("mama lucy", "MAMA LUCY KIBAKI HOSPITAL"),
    ("M.P. Shah", "MP SHAH HOSPITAL"),
    ("kenyatta national", "KENYATTA NATIONAL HOSPITAL"),
    ("nairobi hospital", "THE NAIROBI HOSPITAL"),
    ("pumwani maternity", "PUMWANI MATERNITY AND REFERRAL HOSPITAL"),
])
def test_search_finds_contracted_facilities(journeys, q, name):
    client, _ = journeys
    first = search(client, q)[0]
    assert first["name"] == name
    assert first["contracted"] is True and first["is_demo"] is False
    assert first["sha_level"] and first["sub_county"] and first["contracted_checked_on"]


def test_search_every_facility_is_findable_by_its_own_name(journeys):
    client, _ = journeys
    for f in STORE.facilities.values():
        assert f.id in [r["id"] for r in search(client, f.name)], f.name


def test_search_demo_facilities_are_not_contracted(journeys):
    client, _ = journeys
    for result in search(client, "demo"):
        assert result["is_demo"] is True and result["contracted"] is False and result["sha_level"] is None


def test_search_abbreviation_finds_nothing(journeys):
    # Empty means "not found", never "not contracted": KNH is on the list as "Kenyatta National Hospital".
    client, _ = journeys
    assert search(client, "knh") == []


def test_search_limits_and_validation(journeys):
    client, _ = journeys
    assert len(search(client, "hospital")) == 20
    assert client.get("/api/facilities/search", params={"q": ""}).status_code == 422
    assert search(client, "!!!") == []


# --- Bill Check -----------------------------------------------------------------------

def test_bill_check_sample_bill_1_journey(journeys):
    client, calls = journeys
    body = bill_check(client, "bill1_delivery", device_id="bill1-user")
    assert body["status"] == "ok"
    assert body["facility"] == {"id": "d001", "name": "Demo Hospital Kilimani", "level": 4}
    assert flag_types(body) == ["should_be_free", "above_tariff", "payable"]
    assert body["flags"][1]["message"] == ("SHA pays this Level 4 facility KES 3,360 per day. "
                                           "You are charged KES 5,000 per day. Ask why.")
    assert all(f["source_url"] for f in body["flags"][:2])
    assert body["summary"] == {"amount_in_question_kes": 18280, "balance_kes": 25800}
    assert body["desk_script"] and body["complaint_draft"]
    assert len(calls["dispute"]) == 1 and len(calls["dispute"][0]["items"]) == 2  # only 🔴/🟡 go to Gemma
    assert body["sha_contacts"] and body["disclaimer"].startswith("This is not legal")
    assert body["verified_report_saved"] is True
    # The check loops back into Find: one more Verified Report of paying for maternity at d001.
    assert find(client, "maternity")[0]["coverage"]["verified_paid"] == 5


def test_bill_check_in_swahili(journeys):
    client, _ = journeys
    body = bill_check(client, "bill1_delivery", lang="sw", referral="neither", device_id="sw-user")
    assert body["flags"][1]["message"].startswith("SHA hulipa kituo hiki cha Kiwango cha 4 KES 3,360 kwa siku.")
    assert body["disclaimer"].startswith("Huu si ushauri")
    assert body["summary"]["amount_in_question_kes"] == 18280


def test_bill_check_same_device_twice_saves_one_report(journeys):
    client, _ = journeys
    assert bill_check(client, "bill1_delivery", device_id="twice")["verified_report_saved"] is True
    assert bill_check(client, "bill1_delivery", device_id="twice")["verified_report_saved"] is False
    assert find(client, "maternity")[0]["coverage"]["verified_paid"] == 5


def test_bill_check_not_listed_facility(journeys):
    client, _ = journeys
    body = bill_check(client, "bill1_delivery", facility_id=None, level=4)
    assert body["facility"] == {"id": None, "name": None, "level": 4}
    assert body["summary"]["amount_in_question_kes"] == 18280
    assert body["verified_report_saved"] is False
    assert find(client, "maternity")[0]["coverage"]["verified_paid"] == 4


def test_bill_check_level_decides_the_tariff(journeys):
    client, _ = journeys
    # Same Bill at a "Not listed" Level 6: bed-day Tariff is KES 4,480, not 3,360.
    body = bill_check(client, "bill1_delivery", facility_id=None, level=6)
    assert body["flags"][1]["tariff_kes"] == 4480
    assert body["flags"][1]["amount_in_question_kes"] == (5000 - 4480) * 2


def test_bill_check_unregistered_patient(journeys):
    client, calls = journeys
    body = bill_check(client, "bill1_delivery", registered=False, referral="neither", device_id="unreg")
    assert set(flag_types(body)) == {"payable"}
    assert body["summary"]["amount_in_question_kes"] == 0
    assert "not registered" in body["flags"][0]["message"]
    assert body["desk_script"] is None and calls["dispute"] == []
    assert body["sha_contacts"]  # how to register
    assert body["verified_report_saved"] is False


def test_bill_check_caesarean_with_sha_deduction(journeys):
    client, _ = journeys
    body = bill_check(client, "bill2_caesarean")
    assert body["facility"]["level"] == 5
    assert flag_types(body) == ["should_be_free", "above_tariff", "payable", "payable", "payable"]
    assert body["flags"][1]["tariff_kes"] == 3920
    assert body["flags"][2]["message"].startswith("SHA Tariffs exclude")
    assert body["summary"] == {"amount_in_question_kes": 45000 + 4 * (4500 - 3920), "balance_kes": 48700}


def test_bill_check_fair_bill(journeys):
    client, calls = journeys
    body = bill_check(client, "bill3_fair")
    assert set(flag_types(body)) == {"payable"}
    assert body["flags"][0]["message"].endswith("which is not above the Tariff.")
    assert body["summary"]["amount_in_question_kes"] == 0
    assert body["desk_script"] is None and body["complaint_draft"] is None
    assert calls["dispute"] == []  # nothing to dispute, so no Gemma call


def test_bill_check_unregistered_emergency_still_checks_the_ambulance(journeys):
    client, _ = journeys
    body = bill_check(client, "bill4_emergency", registered=False, referral="emergency")
    assert flag_types(body) == ["above_tariff", "payable", "payable"]
    assert body["flags"][0]["amount_in_question_kes"] == 6000 - 4500
    assert body["summary"]["amount_in_question_kes"] == 1500


def test_bill_check_registered_emergency(journeys):
    client, _ = journeys
    body = bill_check(client, "bill4_emergency", registered=True, referral="emergency")
    assert flag_types(body) == ["above_tariff", "payable", "above_tariff"]
    assert body["flags"][2]["amount_in_question_kes"] == (12000 - 10650) * 2
    assert body["summary"]["amount_in_question_kes"] == 1500 + 2700


@pytest.mark.parametrize("scenario,reason", [
    ("bill5_mismatch", "totals_mismatch"),
    ("bill1_delivery:blurry", "low_confidence"),
    ("not_a_bill", "not_a_bill"),
    ("model_error", "model_error"),
])
@pytest.mark.parametrize("lang", ["en", "sw"])
def test_bill_check_retakes(journeys, scenario, reason, lang):
    client, calls = journeys
    body = bill_check(client, scenario, lang=lang, device_id=f"retake-{scenario}-{lang}")
    assert body == {"status": "retake", "reason": reason, "message": body["message"]}
    assert body["message"].startswith("Hatukuweza" if lang == "sw" and reason != "not_a_bill" else
                                      "Hii" if lang == "sw" else "We could not" if reason != "not_a_bill" else "This")
    assert calls["dispute"] == []
    assert find(client, "maternity")[0]["coverage"]["verified_paid"] == 4  # nothing saved


def test_bill_check_dispute_text_failing_the_wording_check_is_dropped(journeys, monkeypatch):
    client, _ = journeys

    async def accusing(**kwargs):
        return gemma.Dispute(desk_script="This is fraud.", complaint_draft="They overcharged me KES 99,999.")
    monkeypatch.setattr(gemma, "write_dispute", accusing)
    body = bill_check(client, "bill1_delivery", device_id="wording")
    assert body["status"] == "ok" and body["desk_script"] is None and body["complaint_draft"] is None
    assert body["summary"]["amount_in_question_kes"] == 18280


@pytest.mark.parametrize("form,files,status", [
    ({"facility_id": "nope"}, None, 404),
    ({}, None, 422),                                                  # no facility_id or facility_level
    ({"facility_level": "7"}, None, 422),
    ({"facility_id": "d001", "referral": "maybe"}, None, 422),
    ({"facility_id": "d001"}, {"image": ("a.pdf", b"x", "application/pdf")}, 422),
    ({"facility_id": "d001"}, {"image": ("a.jpg", b"x" * (8 * 1024 * 1024 + 1), "image/jpeg")}, 413),
])
def test_bill_check_rejects_bad_requests(journeys, form, files, status):
    client, calls = journeys
    base = {"registered": "true", "referral": "referred", "device_id": "bad"}
    r = client.post("/api/bill-check", data=base | form, files=files or {"image": ("a.jpg", b"bill1_delivery", "image/jpeg")})
    assert r.status_code == status
    assert set(r.json()["error"]) == {"code", "message"}
    assert calls["extract"] == 0  # rejected before any Gemma call


def test_bill_check_mocks(journeys):
    client, calls = journeys
    base = {"registered": "true", "referral": "referred", "device_id": "mock", "facility_id": "d001"}
    files = {"image": ("a.jpg", b"x", "image/jpeg")}
    assert client.post("/api/bill-check?mock=ok", data=base, files=files).json()["status"] == "ok"
    assert client.post("/api/bill-check?mock=retake", data=base, files=files).json()["status"] == "retake"
    assert calls["extract"] == 0


# --- Report (Visit follow-up) -------------------------------------------------------

def test_visit_follow_up_reports_on_a_real_facility(journeys):
    client, _ = journeys
    mama_lucy = search(client, "mama lucy")[0]
    before = mama_lucy["coverage"]

    r = client.post("/api/reports", json={"facility_id": mama_lucy["id"], "service_category": "maternity",
                                          "paid": True, "amount_kes": 5000, "device_id": "visit-1"})
    assert r.status_code == 201 and r.json()["verified"] is False and isinstance(r.json()["id"], int)

    r = client.post("/api/reports", json={"facility_id": mama_lucy["id"], "service_category": "maternity",
                                          "paid": False, "device_id": "visit-1"})
    assert r.status_code == 429 and r.json()["error"]["code"] == "rate_limited"

    client.post("/api/reports", json={"facility_id": mama_lucy["id"], "service_category": "maternity",
                                      "paid": False, "device_id": "visit-2"})
    after = search(client, "mama lucy")[0]["coverage"]
    assert after["unverified_paid"] == before["unverified_paid"] + 1
    assert after["unverified_free"] == before["unverified_free"] + 1
    assert search(client, "mama lucy", service_category="dialysis")[0]["coverage"]["unverified_paid"] == 0


def test_visit_follow_up_on_a_demo_facility_updates_find(journeys):
    client, _ = journeys
    r = client.post("/api/reports", json={"facility_id": "d002", "service_category": "maternity",
                                          "paid": False, "device_id": "visit-3"})
    assert r.status_code == 201
    kibera = next(f for f in find(client, "maternity") if f["id"] == "d002")
    assert kibera["coverage"]["unverified_free"] == 5


def test_report_then_bill_check_same_device_is_rate_limited(journeys):
    client, _ = journeys
    client.post("/api/reports", json={"facility_id": "d001", "service_category": "maternity",
                                      "paid": True, "amount_kes": 15000, "device_id": "both"})
    body = bill_check(client, "bill1_delivery", device_id="both")
    assert body["status"] == "ok" and body["verified_report_saved"] is True  # general_outpatient (bed-day) is new
    assert find(client, "maternity")[0]["coverage"]["verified_paid"] == 4   # maternity was already reported


@pytest.mark.parametrize("body,status", [
    ({"facility_id": "nope", "service_category": "maternity", "paid": False, "device_id": "x"}, 404),
    ({"facility_id": "d001", "service_category": "dentistry", "paid": False, "device_id": "x"}, 422),
    ({"facility_id": "d001", "service_category": "maternity", "paid": True, "amount_kes": -1, "device_id": "x"}, 422),
    ({"facility_id": "d001", "service_category": "maternity", "paid": False, "device_id": ""}, 422),
    ({"facility_id": "d001", "service_category": "maternity", "device_id": "x"}, 422),
])
def test_report_rejects_bad_requests(journeys, body, status):
    client, _ = journeys
    r = client.post("/api/reports", json=body)
    assert r.status_code == status and set(r.json()["error"]) == {"code", "message"}


def test_unknown_route_uses_the_error_shape(journeys):
    client, _ = journeys
    r = client.get("/api/nope")
    assert r.status_code == 404 and r.json()["error"]["code"] == "not_found"
