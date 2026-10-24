"""Rules engine and check of the read, from fixed Line Items. No network calls."""

from app import rules
from app.models import ExtractedBill, ExtractedLineItem
from app.rules import BillContext


def _item(description, quantity, unit_price, amount, category, confidence=0.9):
    return ExtractedLineItem(description=description, quantity=quantity, unit_price_kes=unit_price,
                             amount_kes=amount, category=category, confidence=confidence)


def _bill(items, subtotal=None, deduction=0, balance=None):
    subtotal = sum(i.amount_kes for i in items) if subtotal is None else subtotal
    return ExtractedBill(line_items=items, subtotal_kes=subtotal, sha_deduction_kes=deduction,
                         balance_kes=subtotal - deduction if balance is None else balance)


# SAMPLE bill 1 from the demo script (document.md section 9 example).
BILL_1 = _bill([
    _item("Normal delivery package", 1, 15000, 15000, "normal_delivery", 0.93),
    _item("Ward (2 days)", 2, 5000, 10000, "bed_day", 0.88),
    _item("Multivitamin", 1, 800, 800, "excluded", 0.81),
])

REGISTERED_REFERRED = BillContext(level=4, registered=True, referral="referred", lang="en")


def _run(extracted, tariffs, ctx=REGISTERED_REFERRED):
    assert rules.check_read(extracted) is None
    bill = rules.to_bill(extracted)
    flags = rules.evaluate(bill, tariffs, ctx)
    return bill, flags


def test_bill_1_flags_and_amount_in_question(tariffs):
    bill, flags = _run(BILL_1, tariffs)
    assert [f.flag for f in flags] == ["should_be_free", "above_tariff", "payable"]
    assert [f.amount_in_question_kes for f in flags] == [15000, 3280, 0]
    assert flags[1].tariff_kes == 3360 and flags[1].charged_kes == 5000
    assert flags[1].message == "SHA pays this Level 4 facility KES 3,360 per day. You are charged KES 5,000 per day. Ask why."
    assert flags[0].rule_id == "normal_delivery" and flags[0].source_url
    assert flags[2].rule_id is None and flags[2].source_url is None
    assert rules.amount_in_question(flags, bill.balance_kes) == 18280


def test_fair_bill_is_all_payable(tariffs):
    fair = _bill([
        _item("Ward (2 days)", 2, 3000, 6000, "bed_day"),
        _item("Supplements", 1, 500, 500, "excluded"),
    ])
    _, flags = _run(fair, tariffs)
    assert {f.flag for f in flags} == {"payable"}
    assert sum(f.amount_in_question_kes for f in flags) == 0


def test_amount_in_question_is_capped_at_balance(tariffs):
    extracted = _bill([_item("Normal delivery", 1, 15000, 15000, "normal_delivery")], deduction=10000)
    bill, flags = _run(extracted, tariffs)
    assert bill.balance_kes == 5000
    assert rules.amount_in_question(flags, bill.balance_kes) == 5000


def test_not_registered_makes_everything_payable(tariffs):
    ctx = BillContext(level=4, registered=False, referral="neither", lang="en")
    _, flags = _run(BILL_1, tariffs, ctx)
    assert {f.flag for f in flags} == {"payable"}
    assert "not registered" in flags[0].message


def test_not_registered_emergency_care_still_free_in_an_emergency(tariffs):
    extracted = _bill([
        _item("Casualty care", 1, 4000, 4000, "emergency_care"),
        _item("Ward (1 day)", 1, 5000, 5000, "bed_day"),
    ])
    ctx = BillContext(level=4, registered=False, referral="emergency", lang="en")
    _, flags = _run(extracted, tariffs, ctx)
    assert [f.flag for f in flags] == ["should_be_free", "payable"]

    ctx = BillContext(level=4, registered=False, referral="neither", lang="en")
    _, flags = _run(extracted, tariffs, ctx)
    assert [f.flag for f in flags] == ["payable", "payable"]


def test_not_registered_ambulance_in_an_emergency_is_checked(tariffs):
    extracted = _bill([_item("Ambulance", 1, 6000, 6000, "ambulance")])
    ctx = BillContext(level=4, registered=False, referral="emergency", lang="en")
    _, flags = _run(extracted, tariffs, ctx)
    assert flags[0].flag == "above_tariff" and flags[0].amount_in_question_kes == 1500


def test_no_referral_at_level_4_softens_requires_referral_rules(tariffs):
    ctx = BillContext(level=4, registered=True, referral="neither", lang="en")
    _, flags = _run(BILL_1, tariffs, ctx)
    assert flags[1].flag == "above_tariff"
    assert "This may be covered if you had a referral from a primary facility." in flags[1].message
    # normal_delivery does not require a referral, so its wording is not softened.
    assert "referral" not in flags[0].message


def test_low_confidence_and_other_are_unclear(tariffs):
    extracted = _bill([
        _item("Normal delivery", 1, 15000, 15000, "normal_delivery", confidence=0.4),
        _item("Sundries", 1, 1000, 1000, "other"),
        _item("Ward", 1, 5000, 5000, "bed_day", confidence=0.95),
    ])
    _, flags = _run(extracted, tariffs)
    assert [f.flag for f in flags] == ["unclear", "unclear", "above_tariff"]
    assert flags[0].amount_in_question_kes == 0


def test_unit_price_that_does_not_match_amount_is_unclear(tariffs):
    extracted = _bill([_item("Ward", 2, 5000, 7000, "bed_day")])
    _, flags = _run(extracted, tariffs)
    assert flags[0].flag == "unclear"


def test_missing_unit_price_comes_from_amount_and_quantity(tariffs):
    extracted = _bill([_item("Ward (3 days)", 3, None, 15000, "bed_day")])
    bill, flags = _run(extracted, tariffs)
    assert bill.line_items[0].unit_price_kes == 5000
    assert flags[0].amount_in_question_kes == (5000 - 3360) * 3


def test_no_rule_for_level_is_payable(tariffs):
    ctx = BillContext(level=3, registered=True, referral="referred", lang="en")
    _, flags = _run(_bill([_item("Ward", 1, 5000, 5000, "bed_day")]), tariffs, ctx)
    assert flags[0].flag == "payable" and flags[0].rule_id is None


def test_flat_tariff_wording(tariffs):
    _, flags = _run(_bill([_item("Ambulance", 1, 6000, 6000, "ambulance")]), tariffs)
    assert flags[0].message == "SHA pays this Level 4 facility KES 4,500. You are charged KES 6,000. Ask why."


def test_swahili_messages(tariffs):
    ctx = BillContext(level=4, registered=True, referral="referred", lang="sw")
    _, flags = _run(BILL_1, tariffs, ctx)
    assert flags[1].message == "SHA hulipa kituo hiki cha Kiwango cha 4 KES 3,360 kwa siku. Unatozwa KES 5,000 kwa siku. Uliza kwa nini."
    assert flags[0].message.startswith("Maelezo ya majaribio")


def test_flag_wording_never_accuses(tariffs):
    for lang in ("en", "sw"):
        for registered in (True, False):
            for referral in ("referred", "emergency", "neither"):
                ctx = BillContext(level=4, registered=registered, referral=referral, lang=lang)
                _, flags = _run(BILL_1, tariffs, ctx)
                for f in flags:
                    assert not any(w in f.message.lower() for w in ("illegal", "fraud", "overcharge"))


# --- check the read -----------------------------------------------------------

def test_totals_mismatch():
    extracted = _bill([_item("Ward", 1, 5000, 5000, "bed_day")], subtotal=9000)
    assert rules.check_read(extracted) == "totals_mismatch"


def test_totals_within_one_percent_pass():
    extracted = _bill([_item("Ward", 1, 5000, 5000, "bed_day")], subtotal=5040)
    assert rules.check_read(extracted) is None


def test_missing_subtotal_is_a_retake():
    extracted = ExtractedBill(line_items=[_item("Ward", 1, 5000, 5000, "bed_day")], subtotal_kes=None)
    assert rules.check_read(extracted) == "totals_mismatch"


def test_low_average_confidence():
    extracted = _bill([_item("A", 1, 100, 100, "other", 0.5), _item("B", 1, 100, 100, "other", 0.6)])
    assert rules.check_read(extracted) == "low_confidence"


def test_not_a_bill():
    assert rules.check_read(ExtractedBill(is_bill=False)) == "not_a_bill"
    assert rules.check_read(ExtractedBill(line_items=[], subtotal_kes=0)) == "not_a_bill"


def test_model_numbers_are_parsed():
    item = ExtractedLineItem.model_validate(
        {"description": "x", "amount_kes": "KES 15,000.00", "unit_price_kes": "15,000", "category": "made_up", "confidence": 0.9})
    assert item.amount_kes == 15000 and item.unit_price_kes == 15000 and item.category == "other"


# --- Verified Reports ----------------------------------------------------------

def test_one_verified_report_per_service_category(tariffs):
    bill, flags = _run(BILL_1, tariffs)
    drafts = {d.service_category: d for d in rules.verified_reports(bill, flags)}
    assert set(drafts) == {"maternity", "general_outpatient"}
    assert drafts["maternity"].paid and drafts["maternity"].amount_kes == 15000
    assert drafts["maternity"].flag == "should_be_free"
    assert drafts["general_outpatient"].flag == "above_tariff"
