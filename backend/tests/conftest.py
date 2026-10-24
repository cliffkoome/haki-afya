"""Test fixtures. The data here is for tests only (Demo Facilities, starter
Tariffs from document.md section 6.3) so tests don't change when data/ does."""

import json

import pytest
from fastapi.testclient import TestClient

from app.models import Tariff


def _rule(id, category, service, type, levels, tariff, unit, requires_referral=False, covers_unregistered=False):
    return {
        "id": id, "line_item_category": category, "service_category": service, "type": type,
        "levels": levels, "tariff_kes": tariff, "unit": unit, "requires_referral": requires_referral,
        "covers_unregistered": covers_unregistered,
        "source_url": f"https://example.test/{id}",
        "note_en": f"Test note for {id}.", "note_sw": f"Maelezo ya majaribio ya {id}.",
    }


TEST_TARIFFS = [
    _rule("normal_delivery", "normal_delivery", "maternity", "free", [2, 3, 4, 5, 6], 10000, "per_delivery"),
    _rule("caesarean", "caesarean", "maternity", "free", [2, 3, 4, 5, 6], 30000, "per_delivery"),
    _rule("bed_day_l4", "bed_day", "general_outpatient", "max_per_unit", [4], 3360, "per_day", requires_referral=True),
    _rule("bed_day_l5", "bed_day", "general_outpatient", "max_per_unit", [5], 3920, "per_day", requires_referral=True),
    _rule("emergency_care", "emergency_care", "emergency", "free", [2, 3, 4, 5, 6], None, "per_visit",
          covers_unregistered=True),
    _rule("mri", "mri", "imaging", "max_per_unit", [4, 5, 6], 11000, "per_scan"),
    _rule("ambulance", "ambulance", "emergency", "max_per_unit", [2, 3, 4, 5, 6], 4500, "flat",
          covers_unregistered=True),
]


@pytest.fixture
def tariffs() -> list[Tariff]:
    return [Tariff.model_validate(t) for t in TEST_TARIFFS]


# sha-test-1 is shaped like a row from SHA's list (scripts/import_sha_facilities.py); the name is made up.
FACILITIES_CSV = """id,name,level,lat,lng,service_categories,google_place_id,is_demo,source_url,checked_on,sha_registration_no,sha_level,type,sub_county
d001,Demo Hospital Kilimani,4,-1.2900,36.7833,maternity;imaging;general_outpatient,,true,,2026-10-24,,,,
d002,Demo Clinic Westlands,3,-1.2676,36.8108,maternity;general_outpatient,,true,,2026-10-24,,,,
d003,Demo Hospital Far Away,5,-0.0917,34.7680,maternity,,true,,2026-10-24,,,,
d004,Demo Health Centre No Coordinates,3,,,maternity,,true,,2026-10-24,,,,
sha-test-1,T.Z. TEST REFERRAL HOSPITAL LIMITED,6,,,,,false,https://example.test/sha-list,2026-10-24,TEST-1,Level 6B,SPECIALIZED HOSPITAL,Westlands
"""


def write_data_dir(path, *, facilities=FACILITIES_CSV, demo_reports=None, tariffs=None, keywords=None,
                   contacts=None, areas=None):
    path.mkdir(parents=True, exist_ok=True)
    (path / "facilities.csv").write_text(facilities)
    (path / "tariffs.json").write_text(json.dumps(TEST_TARIFFS if tariffs is None else tariffs))
    (path / "emergency_keywords.json").write_text(json.dumps(
        keywords or {"en": ["chest pain", "can't breathe"], "sw": ["maumivu ya kifua", "hawezi kupumua"]}))
    (path / "sha_contacts.json").write_text(json.dumps(
        contacts or [{"channel": "Test channel", "value": "test@example.test", "source_url": "https://example.test"}]))
    (path / "areas.json").write_text(json.dumps(
        areas or [{"id": "kilimani", "name": "Kilimani", "lat": -1.29, "lng": 36.78}]))
    (path / "demo_reports.csv").write_text(demo_reports or (
        "facility_id,service_category,paid,amount_kes,verified,flag,created_at\n"
        "d001,maternity,true,15000,true,should_be_free,\n"
        "d001,maternity,true,5000,false,,\n"
        "d001,maternity,false,,false,,\n"
        "d001,maternity,true,9000,true,should_be_free,2020-01-01\n"
    ))
    return path


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("HAKI_DATA_DIR", str(write_data_dir(tmp_path / "data")))
    monkeypatch.delenv("GOOGLE_PLACES_API_KEY", raising=False)
    from app.main import app
    with TestClient(app) as c:
        yield c
