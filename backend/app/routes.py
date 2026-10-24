"""API routes. Shapes follow document.md section 9 exactly.

Every route currently returns a mock from app.mocks. Replace each mock with
the real implementation without changing the response shape.
"""

from typing import Literal

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel

from app import mocks

router = APIRouter(prefix="/api")

ServiceCategory = Literal[
    "maternity", "dialysis", "imaging", "eye_care",
    "general_outpatient", "surgery", "cancer_care", "emergency",
]
Lang = Literal["en", "sw"]

MAX_IMAGE_BYTES = 8 * 1024 * 1024


@router.get("/health")
def health():
    return {"ok": True}


class CareNeedRequest(BaseModel):
    text: str
    lang: Lang = "en"


@router.post("/care-need/classify")
def classify_care_need(body: CareNeedRequest):
    # TODO(backend): layer 1 keyword check from data/emergency_keywords.json,
    # then Gemma classify_care_need, then "fallback" on failure.
    return mocks.CARE_NEED_CLASSIFY


@router.get("/facilities")
def list_facilities(
    service_category: ServiceCategory,
    lat: float,
    lng: float,
    lang: Lang = "en",
):
    # TODO(backend): filter facilities by service, sort by distance (max 15 km),
    # attach benefit_summary, 90-day coverage counts and optional Google rating.
    return mocks.FACILITIES


@router.get("/facilities/search")
def search_facilities(q: str = Query(min_length=1)):
    # TODO(backend): case-insensitive name search over facilities.
    return mocks.FACILITY_SEARCH


@router.post("/bill-check")
async def bill_check(
    image: UploadFile = File(...),
    registered: bool = Form(...),
    referral: Literal["referred", "emergency", "neither"] = Form(...),
    device_id: str = Form(...),
    lang: Lang = Form("en"),
    facility_id: str | None = Form(None),
    facility_level: int | None = Form(None, ge=2, le=6),
    mock: Literal["ok", "retake"] = Query("ok", description="Mock only: force a response"),
):
    if facility_id is None and facility_level is None:
        raise HTTPException(422, detail="facility_level is required when facility_id is missing")
    data = await image.read()
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(413, detail="Image must be 8 MB or smaller")
    # TODO(backend): extract_bill (Gemma) -> check the read -> rules engine ->
    # write_dispute (Gemma) -> save Verified Report. Never store `data`.
    return mocks.BILL_CHECK_RETAKE if mock == "retake" else mocks.BILL_CHECK_OK


class ReportRequest(BaseModel):
    facility_id: str
    service_category: ServiceCategory
    paid: bool
    amount_kes: int | None = None
    device_id: str


@router.post("/reports", status_code=201)
def create_report(body: ReportRequest):
    # TODO(backend): insert Unverified Report; 429 rate_limited if this device
    # reported this facility + service in the last 30 days.
    return {"id": 1, "verified": False}
