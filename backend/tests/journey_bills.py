"""Test Bills shared by the offline journeys (fake Gemma) and the live suite (real Gemma).

The images in tests/fixtures/bills/ are rendered from these same numbers by
scripts/make_sample_bills.py. All are SAMPLE bills on Demo Facilities.
"""

from pathlib import Path

from app.models import ExtractedBill, ExtractedLineItem

FIXTURES = Path(__file__).parent / "fixtures" / "bills"

# name -> (facility_id, Line Items as (description, qty, unit, amount, category), subtotal, sha deduction, balance)
BILLS = {
    # SAMPLE bill 1 from the demo script (document.md section 14)
    "bill1_delivery": ("d001", [
        ("Normal delivery package", 1, 15000, 15000, "normal_delivery"),
        ("Ward - general (2 days)", 2, 5000, 10000, "bed_day"),
        ("Multivitamin tablets", 1, 800, 800, "medicine"),
    ], 25800, 0, 25800),
    # Caesarean at Level 5, with an SHA deduction and a private room upgrade
    "bill2_caesarean": ("d006", [
        ("Caesarean section", 1, 45000, 45000, "caesarean"),
        ("Ward - general (4 days)", 4, 4500, 18000, "bed_day"),
        ("Private room upgrade", 2, 3000, 6000, "excluded"),
        ("Laboratory tests", 1, 3200, 3200, "lab_test"),
        ("Pharmacy - medicines", 1, 6500, 6500, "medicine"),
    ], 78700, 30000, 48700),
    # SAMPLE bill 3: the fair bill (Level 3)
    "bill3_fair": ("d002", [
        ("Ward - general (2 days)", 2, 2000, 4000, "bed_day"),
        ("Consultation", 1, 500, 500, "consultation"),
        ("Laboratory tests", 1, 800, 800, "lab_test"),
        ("Pharmacy - medicines", 1, 1200, 1200, "medicine"),
    ], 6500, 0, 6500),
    # Emergency at Level 4: ambulance, casualty, dialysis
    "bill4_emergency": ("d014", [
        ("Ambulance - emergency transfer", 1, 6000, 6000, "ambulance"),
        ("Casualty / emergency care", 1, 3500, 3500, "emergency_care"),
        ("Haemodialysis session", 2, 12000, 24000, "haemodialysis_session"),
    ], 33500, 0, 33500),
    # The printed total doesn't match the Line Items
    "bill5_mismatch": ("d017", [
        ("Consultation", 1, 3000, 3000, "consultation"),
        ("Laboratory tests", 1, 2000, 2000, "lab_test"),
    ], 9000, 0, 9000),
}


def extracted(name: str, confidence: float = 0.92) -> ExtractedBill:
    """What a perfect read of the Bill looks like."""
    _, items, subtotal, sha, balance = BILLS[name]
    return ExtractedBill(
        line_items=[ExtractedLineItem(description=d, quantity=q, unit_price_kes=u, amount_kes=a,
                                      category=c, confidence=confidence) for d, q, u, a, c in items],
        subtotal_kes=subtotal, sha_deduction_kes=sha, balance_kes=balance,
    )
