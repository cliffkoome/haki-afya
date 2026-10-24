"""Load and check the open dataset in data/ (document.md section 8).

Run `python -m app.data` from backend/ to check the data files without
starting the server. A file that breaks a hard rule stops the app from
starting, on purpose.
"""

import csv
import json
import logging
import os
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from pydantic import BaseModel, TypeAdapter

from app.models import SERVICE_CATEGORIES, Tariff

log = logging.getLogger(__name__)

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DATA_DIR = REPO_ROOT / "data"


class DataError(ValueError):
    pass


@dataclass(frozen=True)
class Facility:
    id: str
    name: str
    level: int
    lat: float | None
    lng: float | None
    service_categories: tuple[str, ...]
    google_place_id: str | None
    is_demo: bool
    # From SHA's list of Contracted Facilities (empty for Demo Facilities).
    sha_level: str = ""
    type: str = ""
    sub_county: str = ""
    checked_on: str = ""

    @property
    def contracted(self) -> bool:
        """On SHA's list. Every real facility in facilities.csv comes from that list."""
        return not self.is_demo


@dataclass(frozen=True)
class DemoReport:
    facility_id: str
    service_category: str
    paid: bool
    amount_kes: int | None
    verified: bool
    flag: str | None
    created_at: str


class Area(BaseModel):
    id: str
    name: str
    lat: float
    lng: float


class ShaContact(BaseModel):
    channel: str
    value: str
    source_url: str


class EmergencyKeywords(BaseModel):
    en: list[str] = []
    sw: list[str] = []


@dataclass
class Store:
    facilities: dict[str, Facility]
    tariffs: list[Tariff]
    emergency_keywords: EmergencyKeywords
    sha_contacts: list[ShaContact]
    areas: list[Area]
    demo_reports: list[DemoReport]
    warnings: list[str] = field(default_factory=list)


def _bool(value: str, where: str) -> bool:
    v = value.strip().lower()
    if v in ("true", "1", "yes"):
        return True
    if v in ("false", "0", "no", ""):
        return False
    raise DataError(f"{where}: expected true/false, got {value!r}")


def _float_or_none(value: str, where: str) -> float | None:
    if not value.strip():
        return None
    try:
        return float(value)
    except ValueError:
        raise DataError(f"{where}: expected a number, got {value!r}") from None


def utc_iso(value: str | None = None) -> str:
    """Normalise a date or datetime to UTC ISO seconds, so stored strings compare correctly."""
    dt = datetime.fromisoformat(value) if value else datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat(timespec="seconds")


def load_facilities(path: Path, warnings: list[str]) -> dict[str, Facility]:
    facilities: dict[str, Facility] = {}
    with path.open(newline="", encoding="utf-8") as f:
        for n, row in enumerate(csv.DictReader(f), start=2):
            where = f"{path.name} line {n}"
            fid = (row.get("id") or "").strip()
            if not fid:
                raise DataError(f"{where}: missing id")
            if fid in facilities:
                raise DataError(f"{where}: duplicate id {fid}")
            name = (row.get("name") or "").strip()
            if not name:
                raise DataError(f"{where}: missing name")
            try:
                level = int(row["level"])
            except (KeyError, ValueError):
                raise DataError(f"{where}: level must be a number from 2 to 6") from None
            if level not in range(2, 7):
                raise DataError(f"{where}: level must be from 2 to 6, got {level}")
            categories = tuple(c.strip() for c in (row.get("service_categories") or "").split(";") if c.strip())
            unknown = set(categories) - set(SERVICE_CATEGORIES)
            if unknown:
                raise DataError(f"{where}: unknown service_categories {sorted(unknown)}")
            is_demo = _bool(row.get("is_demo") or "", f"{where} is_demo")
            # Rule 6: a Demo Facility must be clearly fictional.
            if is_demo and "demo" not in name.lower():
                raise DataError(f"{where}: Demo Facility names must contain 'Demo' ({name!r})")
            lat = _float_or_none(row.get("lat") or "", f"{where} lat")
            lng = _float_or_none(row.get("lng") or "", f"{where} lng")
            if not is_demo and not (row.get("source_url") or "").strip():
                raise DataError(f"{where}: {fid} has no source_url (real facilities must come from SHA's list)")
            facilities[fid] = Facility(
                id=fid, name=name, level=level, lat=lat, lng=lng,
                service_categories=categories,
                google_place_id=(row.get("google_place_id") or "").strip() or None,
                is_demo=is_demo,
                sha_level=(row.get("sha_level") or "").strip(),
                type=(row.get("type") or "").strip(),
                sub_county=(row.get("sub_county") or "").strip(),
                checked_on=(row.get("checked_on") or "").strip(),
            )
    no_coords = sum(f.lat is None or f.lng is None for f in facilities.values())
    no_services = sum(not f.service_categories for f in facilities.values())
    if no_coords:
        warnings.append(f"{path.name}: {no_coords} facilities have no lat/lng; they are searchable but not shown in Find")
    if no_services:
        warnings.append(f"{path.name}: {no_services} facilities have no service_categories; they are searchable but not shown in Find")
    return facilities


def load_demo_reports(path: Path, facilities: dict[str, Facility]) -> list[DemoReport]:
    reports = []
    with path.open(newline="", encoding="utf-8") as f:
        for n, row in enumerate(csv.DictReader(f), start=2):
            where = f"{path.name} line {n}"
            fid = (row.get("facility_id") or "").strip()
            facility = facilities.get(fid)
            if facility is None:
                raise DataError(f"{where}: unknown facility_id {fid!r}")
            # Rule 6: invented Coverage Reports only on Demo Facilities.
            if not facility.is_demo:
                raise DataError(f"{where}: {fid} is not a Demo Facility; invented reports are only allowed on Demo Facilities")
            category = (row.get("service_category") or "").strip()
            if category not in SERVICE_CATEGORIES:
                raise DataError(f"{where}: unknown service_category {category!r}")
            amount = (row.get("amount_kes") or "").strip()
            flag = (row.get("flag") or "").strip() or None
            if flag not in (None, "should_be_free", "above_tariff", "payable", "unclear"):
                raise DataError(f"{where}: unknown flag {flag!r}")
            try:
                created_at = utc_iso((row.get("created_at") or "").strip() or None)
            except ValueError:
                raise DataError(f"{where}: created_at must be an ISO date like 2026-10-24") from None
            reports.append(DemoReport(
                facility_id=fid, service_category=category,
                paid=_bool(row.get("paid") or "", f"{where} paid"),
                amount_kes=int(amount) if amount else None,
                verified=_bool(row.get("verified") or "", f"{where} verified"),
                flag=flag, created_at=created_at,
            ))
    return reports


def _json(path: Path, adapter: TypeAdapter):
    try:
        return adapter.validate_json(path.read_bytes())
    except ValueError as e:
        raise DataError(f"{path.name}: {e}") from None


def load(data_dir: Path | None = None) -> Store:
    data_dir = Path(data_dir or os.environ.get("HAKI_DATA_DIR") or DEFAULT_DATA_DIR)
    warnings: list[str] = []

    facilities = load_facilities(data_dir / "facilities.csv", warnings)
    tariffs = _json(data_dir / "tariffs.json", TypeAdapter(list[Tariff]))
    ids = [t.id for t in tariffs]
    if len(ids) != len(set(ids)):
        raise DataError("tariffs.json: rule ids must be unique")
    for t in tariffs:
        if not t.source_url:
            warnings.append(f"tariffs.json: rule {t.id} has no source_url")
        if t.type == "max_per_unit" and t.tariff_kes is None:
            raise DataError(f"tariffs.json: max_per_unit rule {t.id} needs tariff_kes")

    store = Store(
        facilities=facilities,
        tariffs=tariffs,
        emergency_keywords=_json(data_dir / "emergency_keywords.json", TypeAdapter(EmergencyKeywords)),
        sha_contacts=_json(data_dir / "sha_contacts.json", TypeAdapter(list[ShaContact])),
        areas=_json(data_dir / "areas.json", TypeAdapter(list[Area])),
        demo_reports=load_demo_reports(data_dir / "demo_reports.csv", facilities),
        warnings=warnings,
    )
    if not store.emergency_keywords.en or not store.emergency_keywords.sw:
        warnings.append("emergency_keywords.json: en or sw list is empty; Emergency layer 1 is not working")
    if not store.sha_contacts:
        warnings.append("sha_contacts.json is empty; Complaint Drafts will have no SHA contact details")
    for c in store.sha_contacts:
        if not c.source_url:
            warnings.append(f"sha_contacts.json: {c.channel!r} has no source_url")
    if not store.areas:
        warnings.append("areas.json is empty; there is no fallback when location is denied")
    return store


if __name__ == "__main__":
    s = load()
    demo = sum(f.is_demo for f in s.facilities.values())
    print(f"OK: {len(s.facilities)} facilities ({demo} demo), {len(s.tariffs)} tariff rules, "
          f"{len(s.emergency_keywords.en)}+{len(s.emergency_keywords.sw)} emergency keywords, "
          f"{len(s.sha_contacts)} SHA contacts, {len(s.areas)} areas, {len(s.demo_reports)} demo reports")
    for w in s.warnings:
        print(f"WARNING: {w}")
