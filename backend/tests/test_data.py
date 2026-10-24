"""Seed checks on the data files (document.md sections 5.6 and 8)."""

import pytest

from app import data
from tests.conftest import write_data_dir

REAL_FACILITY = (
    "id,name,level,lat,lng,service_categories,google_place_id,is_demo,source_url,checked_on\n"
    "f001,Example Health Centre,3,-1.2921,36.8219,maternity,,false,https://example.test,2026-10-24\n"
    "d001,Demo Hospital Kilimani,4,-1.2900,36.7833,maternity,,true,,2026-10-24\n"
)


def test_test_data_loads(tmp_path):
    store = data.load(write_data_dir(tmp_path))
    assert len(store.facilities) == 5
    assert len(store.demo_reports) == 4


def test_demo_reports_on_a_real_facility_are_rejected(tmp_path):
    reports = "facility_id,service_category,paid,amount_kes,verified,flag,created_at\nf001,maternity,true,5000,true,,\n"
    with pytest.raises(data.DataError, match="not a Demo Facility"):
        data.load(write_data_dir(tmp_path, facilities=REAL_FACILITY, demo_reports=reports))


def test_demo_facility_name_must_say_demo(tmp_path):
    facilities = REAL_FACILITY.replace("f001,Example Health Centre,3,-1.2921,36.8219,maternity,,false",
                                       "f001,Example Health Centre,3,-1.2921,36.8219,maternity,,true")
    with pytest.raises(data.DataError, match="must contain 'Demo'"):
        data.load(write_data_dir(tmp_path, facilities=facilities))


def test_unknown_service_category_is_rejected(tmp_path):
    facilities = REAL_FACILITY.replace("3,-1.2921,36.8219,maternity", "3,-1.2921,36.8219,dentistry")
    with pytest.raises(data.DataError, match="unknown service_categories"):
        data.load(write_data_dir(tmp_path, facilities=facilities))


def test_real_facility_without_source_url_is_rejected(tmp_path):
    facilities = REAL_FACILITY.replace(",false,https://example.test,", ",false,,")
    with pytest.raises(data.DataError, match="no source_url"):
        data.load(write_data_dir(tmp_path, facilities=facilities))


def test_missing_tariff_source_url_is_a_warning(tmp_path):
    tariffs = [{
        "id": "x", "line_item_category": "mri", "service_category": "imaging", "type": "max_per_unit",
        "levels": [4], "tariff_kes": 1, "unit": "per_scan", "source_url": "", "note_en": "a", "note_sw": "b",
    }]
    store = data.load(write_data_dir(tmp_path, tariffs=tariffs))
    assert any("rule x has no source_url" in w for w in store.warnings)


def test_repo_data_files_load():
    """The real data/ files must always pass the seed checks."""
    data.load(data.DEFAULT_DATA_DIR)
