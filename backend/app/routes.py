"""API routes. Shapes follow document.md section 9 exactly."""

import asyncio
import json
import logging
import math
import re
from datetime import datetime, timezone
from typing import Annotated, Literal

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile
from pydantic import BaseModel, Field

from app import db, emergency, gemma, messages, mocks, places, rules, wording
from app.data import Facility, Store
from app.models import Lang, Referral, ServiceCategory, Tariff

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api")

MAX_IMAGE_BYTES = 8 * 1024 * 1024
MAX_DISTANCE_KM = 15
SEARCH_LIMIT = 20


def get_store(request: Request) -> Store:
    return request.app.state.store


StoreDep = Annotated[Store, Depends(get_store)]


@router.get("/health")
def health():
    return {"ok": True}


# --- Find --------------------------------------------------------------------

class CareNeedRequest(BaseModel):
    text: str = Field(min_length=1, max_length=500)
    lang: Lang = "en"


@router.post("/care-need/classify")
async def classify_care_need(body: CareNeedRequest, store: StoreDep):
    # Layer 1: keywords in code, before any Gemma call.
    if emergency.is_emergency(body.text, store.emergency_keywords):
        return {"service_category": "emergency", "is_emergency": True, "matched_by": "keywords"}
    try:
        result = await gemma.classify_care_need(body.text, body.lang)
    except gemma.GemmaError as e:
        log.warning("classify_care_need failed: %s", e)
        return {"service_category": None, "is_emergency": False, "matched_by": "fallback"}
    return {"service_category": result.service_category, "is_emergency": result.is_emergency, "matched_by": "model"}


def distance_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle (haversine) distance."""
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 6371.0 * 2 * math.asin(math.sqrt(a))


def benefit_summary(tariffs: list[Tariff], service_category: str, level: int, lang: Lang) -> str:
    """What SHA covers for this Service Category at this level, from tariffs.json notes."""
    notes = [t.note(lang) for t in tariffs if t.service_category == service_category and level in t.levels]
    return " ".join(dict.fromkeys(notes)) or messages.NO_BENEFIT_DATA[lang]


@router.get("/facilities")
async def list_facilities(
    store: StoreDep,
    service_category: ServiceCategory,
    lat: float = Query(ge=-90, le=90),
    lng: float = Query(ge=-180, le=180),
    lang: Lang = "en",
):
    # Coordinates are used for this request only and never stored.
    nearby: list[tuple[float, Facility]] = []
    for f in store.facilities.values():
        if service_category in f.service_categories and f.lat is not None and f.lng is not None:
            d = distance_km(lat, lng, f.lat, f.lng)
            if d <= MAX_DISTANCE_KM:
                nearby.append((d, f))
    nearby.sort(key=lambda pair: pair[0])  # distance only, no blended score

    async with httpx.AsyncClient() as client:
        ratings = await asyncio.gather(*(places.rating(client, f.google_place_id) for _, f in nearby))

    return {"facilities": [
        {
            "id": f.id,
            "name": f.name,
            "level": f.level,
            "is_demo": f.is_demo,
            "lat": f.lat,
            "lng": f.lng,
            "distance_km": round(d, 1),
            "benefit_summary": benefit_summary(store.tariffs, service_category, f.level, lang),
            "coverage": db.coverage_counts(f.id, service_category),
            "google": rating,
        }
        for (d, f), rating in zip(nearby, ratings)
    ]}


def _search_tokens(text: str) -> list[str]:
    """'M.P. Shah' -> ['mp', 'shah']: dots and apostrophes join, other punctuation splits."""
    return re.sub(r"[^a-z0-9]+", " ", re.sub(r"[.'’]", "", text.lower())).split()


@router.get("/facilities/search")
def search_facilities(
    store: StoreDep,
    q: str = Query(min_length=1, max_length=100),
    service_category: ServiceCategory | None = None,
):
    """Search all facilities by name. A facility that isn't found is not on SHA's contracted list (as of checked_on)."""
    query = _search_tokens(q)
    if not query:
        return {"facilities": []}
    joined = " ".join(query)
    matches = []
    for f in store.facilities.values():
        name = _search_tokens(f.name)
        # Every word typed must start some word of the name, in any order.
        if all(any(word.startswith(t) for word in name) for t in query):
            ranked = name[1:] if name[:1] == ["the"] else name  # "THE NAIROBI HOSPITAL" starts with "nairobi"
            matches.append((not " ".join(ranked).startswith(joined), f.name.lower(), f))
    matches.sort(key=lambda m: m[:2])  # names that start with the query first, then alphabetical
    return {"facilities": [
        {
            "id": f.id, "name": f.name, "level": f.level, "is_demo": f.is_demo,
            "contracted": f.contracted, "contracted_checked_on": f.checked_on or None,
            "sha_level": f.sha_level or None, "type": f.type or None, "sub_county": f.sub_county or None,
            "coverage": db.coverage_counts(f.id, service_category),
        }
        for *_, f in matches[:SEARCH_LIMIT]
    ]}


@router.get("/areas")
def list_areas(store: StoreDep):
    return {"areas": [a.model_dump() for a in store.areas]}


# --- Bill Check --------------------------------------------------------------

def _retake(reason: str, lang: Lang) -> dict:
    return {"status": "retake", "reason": reason, "message": messages.RETAKE[reason][lang]}


async def _dispute(store: Store, facility: dict, bill, flags, summary: dict, registered: bool, lang: Lang):
    """Desk Script + Complaint Draft from the Flags (not the image). (None, None) on any failure."""
    asked = [
        {"description": bill.line_items[f.line_item_index].description, "flag": f.flag,
         "tariff_kes": f.tariff_kes, "charged_kes": f.charged_kes,
         "amount_in_question_kes": f.amount_in_question_kes, "message": f.message}
        for f in flags if f.flag in ("should_be_free", "above_tariff")
    ]
    if not asked:
        return None, None  # nothing to dispute: the bill looks fair
    flags_input = {"items": asked, "total_amount_in_question_kes": summary["amount_in_question_kes"],
                   "balance_kes": summary["balance_kes"]}
    contacts = [c.model_dump() for c in store.sha_contacts]
    try:
        d = await gemma.write_dispute(facility=facility, flags=flags_input, sha_contacts=contacts,
                                      registered=registered, lang=lang)
    except gemma.GemmaError as e:
        log.warning("write_dispute failed: %s", e)
        return None, None

    allowed = wording.numbers_in(json.dumps([facility, flags_input, contacts]))
    allowed.add(datetime.now(timezone.utc).year)
    texts = []
    for name, text in (("desk_script", d.desk_script), ("complaint_draft", d.complaint_draft)):
        issues = wording.problems(text, allowed)
        if issues:
            log.warning("Dropped %s from Gemma: %s", name, "; ".join(issues))
        texts.append(None if issues else text)
    return tuple(texts)


@router.post("/bill-check")
async def bill_check(
    store: StoreDep,
    image: UploadFile = File(...),
    registered: bool = Form(...),
    referral: Referral = Form(...),
    device_id: str = Form(..., min_length=1, max_length=100),
    lang: Lang = Form("en"),
    facility_id: str | None = Form(None),
    facility_level: int | None = Form(None, ge=2, le=6),
    mock: Literal["ok", "retake"] | None = Query(None, description="Frontend testing only: return the contract example"),
):
    facility = None
    if facility_id:
        facility = store.facilities.get(facility_id)
        if facility is None:
            raise HTTPException(404, detail=messages.FACILITY_NOT_FOUND)
    elif facility_level is None:
        raise HTTPException(422, detail="facility_level is required when facility_id is missing")
    level = facility.level if facility else facility_level

    mime_type = image.content_type or ""
    if not mime_type.startswith("image/"):
        raise HTTPException(422, detail="image must be a photo")
    data = await image.read(MAX_IMAGE_BYTES + 1)
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(413, detail="Image must be 8 MB or smaller")

    if mock:
        return mocks.BILL_CHECK_RETAKE if mock == "retake" else mocks.BILL_CHECK_OK

    # The Bill photo lives only in this request's memory. It is never written anywhere.
    try:
        extracted = await gemma.extract_bill(data, mime_type)
    except gemma.GemmaError as e:
        log.warning("extract_bill failed: %s", e)
        return _retake("model_error", lang)
    finally:
        del data
        await image.close()

    reason = rules.check_read(extracted)
    if reason:
        return _retake(reason, lang)

    bill = rules.to_bill(extracted)
    ctx = rules.BillContext(level=level, registered=registered, referral=referral, lang=lang)
    flags = rules.evaluate(bill, store.tariffs, ctx)
    summary = {"amount_in_question_kes": rules.amount_in_question(flags, bill.balance_kes),
               "balance_kes": bill.balance_kes}
    facility_out = ({"id": facility.id, "name": facility.name, "level": facility.level} if facility
                    else {"id": None, "name": None, "level": level})

    desk_script, complaint_draft = await _dispute(store, facility_out, bill, flags, summary, registered, lang)

    # Verified Reports: only for a listed facility, and only when SHA cover applied
    # (an unregistered Patient paying says nothing about the facility's SHA cover).
    saved = False
    if facility and registered:
        for r in rules.verified_reports(bill, flags):
            try:
                db.add_report(facility_id=facility.id, service_category=r.service_category, paid=r.paid,
                              amount_kes=r.amount_kes, verified=True, flag=r.flag, device_id=device_id)
                saved = True
            except db.RateLimited:
                pass

    return {
        "status": "ok",
        "facility": facility_out,
        "bill": bill.model_dump(),
        "flags": [f.model_dump() for f in flags],
        "summary": summary,
        "desk_script": desk_script,
        "complaint_draft": complaint_draft,
        "sha_contacts": [c.model_dump() for c in store.sha_contacts],
        "verified_report_saved": saved,
        "disclaimer": messages.DISCLAIMER[lang],
    }


# --- Report ------------------------------------------------------------------

class ReportRequest(BaseModel):
    facility_id: str
    service_category: ServiceCategory
    paid: bool
    amount_kes: int | None = Field(None, ge=0)
    device_id: str = Field(min_length=1, max_length=100)


@router.post("/reports", status_code=201)
def create_report(body: ReportRequest, store: StoreDep):
    if body.facility_id not in store.facilities:
        raise HTTPException(404, detail=messages.FACILITY_NOT_FOUND)
    try:
        report_id = db.add_report(
            facility_id=body.facility_id, service_category=body.service_category, paid=body.paid,
            amount_kes=body.amount_kes if body.paid else None, verified=False, flag=None,
            device_id=body.device_id,
        )
    except db.RateLimited:
        raise HTTPException(429, detail=messages.RATE_LIMITED) from None
    return {"id": report_id, "verified": False}
