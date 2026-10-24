"""Shared types. Names follow GLOSSARY.md; ids follow document.md sections 6 and 9."""

import re
from typing import Literal, get_args

from pydantic import BaseModel, Field, field_validator

ServiceCategory = Literal[
    "maternity", "dialysis", "imaging", "eye_care",
    "general_outpatient", "surgery", "cancer_care", "emergency",
]
SERVICE_CATEGORIES: tuple[str, ...] = get_args(ServiceCategory)

LineItemCategory = Literal[
    "bed_day", "normal_delivery", "caesarean", "mri", "ct", "haemodialysis_session",
    "icu_day", "ambulance", "emergency_care", "consultation", "medicine", "lab_test",
    "excluded", "other",
]
LINE_ITEM_CATEGORIES: tuple[str, ...] = get_args(LineItemCategory)

Lang = Literal["en", "sw"]
Referral = Literal["referred", "emergency", "neither"]
FlagType = Literal["should_be_free", "above_tariff", "payable", "unclear"]
RetakeReason = Literal["totals_mismatch", "low_confidence", "not_a_bill", "model_error"]

TariffUnit = Literal[
    "per_delivery", "per_day", "per_session", "per_scan", "per_trip",
    "per_visit", "per_procedure", "flat",
]


class Tariff(BaseModel):
    """One rule from data/tariffs.json."""

    id: str
    line_item_category: LineItemCategory
    service_category: ServiceCategory
    type: Literal["free", "max_per_unit"]
    levels: list[int] = Field(min_length=1)
    tariff_kes: int | None = None
    unit: TariffUnit
    requires_referral: bool = False
    # Applies to every Kenyan in an Emergency, registered with SHA or not.
    covers_unregistered: bool = False
    source_url: str = ""
    note_en: str
    note_sw: str

    @field_validator("levels")
    @classmethod
    def _levels_in_range(cls, v: list[int]) -> list[int]:
        if any(level not in range(2, 7) for level in v):
            raise ValueError("levels must be between 2 and 6")
        return v

    def note(self, lang: Lang) -> str:
        return self.note_sw if lang == "sw" else self.note_en


def _to_kes(v):
    """Accept 15000, 15000.0, "15,000" or "KES 15,000.00" from the model; keep None."""
    if v is None or isinstance(v, bool):
        return v
    if isinstance(v, str):
        cleaned = re.sub(r"(?i)kes|ksh|/=|[,\s]", "", v)
        if cleaned in ("", "-"):
            return None
        v = float(cleaned)
    return round(v)


class ExtractedLineItem(BaseModel):
    """One Line Item as read by Gemma (extract_bill). Numbers are as printed, or None."""

    description: str = ""
    quantity: float | None = None
    unit_price_kes: int | None = None
    amount_kes: int
    category: LineItemCategory = "other"
    confidence: float = Field(ge=0, le=1)

    _kes = field_validator("unit_price_kes", "amount_kes", mode="before")(_to_kes)

    @field_validator("category", mode="before")
    @classmethod
    def _unknown_category_is_other(cls, v):
        return v if v in LINE_ITEM_CATEGORIES else "other"


class ExtractedBill(BaseModel):
    is_bill: bool = True
    line_items: list[ExtractedLineItem] = []
    subtotal_kes: int | None = None
    sha_deduction_kes: int | None = None
    balance_kes: int | None = None

    _kes = field_validator("subtotal_kes", "sha_deduction_kes", "balance_kes", mode="before")(_to_kes)


class LineItem(BaseModel):
    """A Line Item after the read has been checked: the shape in the API response."""

    description: str
    quantity: float
    unit_price_kes: int
    amount_kes: int
    category: LineItemCategory
    confidence: float


class Bill(BaseModel):
    line_items: list[LineItem]
    subtotal_kes: int
    sha_deduction_kes: int
    balance_kes: int


class Flag(BaseModel):
    line_item_index: int
    flag: FlagType
    tariff_kes: int | None
    charged_kes: int
    amount_in_question_kes: int
    message: str
    rule_id: str | None
    source_url: str | None
    # Internal: which Service Category this Line Item counts towards for the
    # Verified Report. Not part of the API contract.
    service_category: ServiceCategory | None = Field(default=None, exclude=True)
