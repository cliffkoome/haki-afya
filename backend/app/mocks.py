"""Example responses copied from document.md section 9.

POST /api/bill-check?mock=ok|retake returns these without calling Gemma, so
the frontend can test both result screens. Keep them in sync with
document.md: if the contract changes, change both.
"""

CARE_NEED_CLASSIFY = {
    "service_category": "maternity",
    "is_emergency": False,
    "matched_by": "model",
}

CARE_NEED_EMERGENCY = {
    "service_category": "emergency",
    "is_emergency": True,
    "matched_by": "keywords",
}

FACILITIES = {
    "facilities": [
        {
            "id": "d001",
            "name": "Demo Hospital Kilimani",
            "level": 4,
            "is_demo": True,
            "lat": -1.29,
            "lng": 36.78,
            "distance_km": 3.4,
            "benefit_summary": (
                "SHA covers normal delivery (KES 10,000) and caesarean (KES 30,000). "
                "You should not pay out of pocket."
            ),
            "coverage": {
                "window_days": 90,
                "verified_paid": 4,
                "verified_free": 1,
                "unverified_paid": 2,
                "unverified_free": 3,
            },
            "google": {"rating": 4.1, "user_rating_count": 212},
        }
    ]
}

FACILITY_SEARCH = {
    "facilities": [
        {"id": "d001", "name": "Demo Hospital Kilimani", "level": 4, "is_demo": True}
    ]
}

BILL_CHECK_OK = {
    "status": "ok",
    "facility": {"id": "d001", "name": "Demo Hospital Kilimani", "level": 4},
    "bill": {
        "line_items": [
            {"description": "Normal delivery package", "quantity": 1, "unit_price_kes": 15000,
             "amount_kes": 15000, "category": "normal_delivery", "confidence": 0.93},
            {"description": "Ward (2 days)", "quantity": 2, "unit_price_kes": 5000,
             "amount_kes": 10000, "category": "bed_day", "confidence": 0.88},
            {"description": "Multivitamin", "quantity": 1, "unit_price_kes": 800,
             "amount_kes": 800, "category": "excluded", "confidence": 0.81},
        ],
        "subtotal_kes": 25800,
        "sha_deduction_kes": 0,
        "balance_kes": 25800,
    },
    "flags": [
        {"line_item_index": 0, "flag": "should_be_free", "tariff_kes": 10000, "charged_kes": 15000,
         "amount_in_question_kes": 15000,
         "message": ("SHA covers normal delivery at Level 4. Registered members should not pay "
                     "out of pocket. Ask why you are being charged."),
         "rule_id": "normal_delivery", "source_url": None},
        {"line_item_index": 1, "flag": "above_tariff", "tariff_kes": 3360, "charged_kes": 5000,
         "amount_in_question_kes": 3280,
         "message": ("SHA pays this Level 4 facility KES 3,360 per day. You are charged "
                     "KES 5,000 per day. Ask why."),
         "rule_id": "bed_day_l4", "source_url": None},
        {"line_item_index": 2, "flag": "payable", "tariff_kes": None, "charged_kes": 800,
         "amount_in_question_kes": 0, "message": "Supplements are not covered by SHA.",
         "rule_id": None, "source_url": None},
    ],
    "summary": {"amount_in_question_kes": 18280, "balance_kes": 25800},
    "desk_script": ("Hello, I am registered with SHA. SHA covers normal delivery here, and pays "
                    "KES 3,360 per ward day. Could you explain these charges?"),
    "complaint_draft": "To: SHA\n\n[MOCK] Complaint draft goes here.",
    "sha_contacts": [],
    "verified_report_saved": True,
    "disclaimer": "This is not legal or medical advice. Tariffs may have changed; confirm with SHA.",
}

BILL_CHECK_RETAKE = {
    "status": "retake",
    "reason": "totals_mismatch",
    "message": ("We could not read this bill clearly. Please retake the photo flat, in good "
                "light, with the whole bill visible."),
}
