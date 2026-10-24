"""Check the read, then the rules engine. Plain code: Gemma never decides a Flag.

document.md sections 6.2 and 6.3.
"""

from dataclasses import dataclass

from app import messages
from app.models import (
    Bill, ExtractedBill, Flag, FlagType, Lang, LineItem, Referral, RetakeReason, Tariff,
)

LOW_CONFIDENCE = 0.6
TOTALS_TOLERANCE = 0.01  # Line Items must add up to the subtotal within 1%

# Most to least in need of attention; used to pick one Flag per Service Category.
FLAG_SEVERITY: dict[FlagType, int] = {"should_be_free": 3, "above_tariff": 2, "unclear": 1, "payable": 0}


@dataclass(frozen=True)
class BillContext:
    level: int
    registered: bool
    referral: Referral
    lang: Lang


def _within(a: float, b: float, tolerance: float = TOTALS_TOLERANCE) -> bool:
    return abs(a - b) <= tolerance * max(abs(b), 1)


def check_read(extracted: ExtractedBill) -> RetakeReason | None:
    """Return a retake reason if the read can't be trusted. Never guess."""
    items = extracted.line_items
    if not extracted.is_bill or not items:
        return "not_a_bill"
    if extracted.subtotal_kes is None:
        return "totals_mismatch"
    if not _within(sum(i.amount_kes for i in items), extracted.subtotal_kes):
        return "totals_mismatch"
    if sum(i.confidence for i in items) / len(items) < LOW_CONFIDENCE:
        return "low_confidence"
    return None


def to_bill(extracted: ExtractedBill) -> Bill:
    """Fill gaps that follow by arithmetic alone. Call only after check_read passes."""
    line_items = []
    for i in extracted.line_items:
        quantity = i.quantity if i.quantity and i.quantity > 0 else 1
        unit_price = i.unit_price_kes if i.unit_price_kes is not None else round(i.amount_kes / quantity)
        line_items.append(LineItem(
            description=i.description, quantity=quantity, unit_price_kes=unit_price,
            amount_kes=i.amount_kes, category=i.category, confidence=i.confidence,
        ))
    deduction = extracted.sha_deduction_kes or 0
    balance = extracted.balance_kes
    if balance is None:
        balance = max(extracted.subtotal_kes - deduction, 0)
    return Bill(line_items=line_items, subtotal_kes=extracted.subtotal_kes,
                sha_deduction_kes=deduction, balance_kes=balance)


def find_rule(tariffs: list[Tariff], category: str, level: int) -> Tariff | None:
    return next((t for t in tariffs if t.line_item_category == category and level in t.levels), None)


def _flag(index: int, flag: FlagType, item: LineItem, message: str, *, charged: int | None = None,
          tariff: int | None = None, in_question: int = 0, rule: Tariff | None = None) -> Flag:
    return Flag(
        line_item_index=index, flag=flag, tariff_kes=tariff,
        charged_kes=item.amount_kes if charged is None else charged,
        amount_in_question_kes=in_question, message=message,
        rule_id=rule.id if rule else None,
        source_url=(rule.source_url or None) if rule else None,
        service_category=rule.service_category if rule else None,
    )


def flag_line_item(index: int, item: LineItem, tariffs: list[Tariff], ctx: BillContext) -> Flag:
    """Exactly one Flag per Line Item (document.md section 6.3)."""
    lang = ctx.lang

    if item.confidence < LOW_CONFIDENCE:
        return _flag(index, "unclear", item, messages.UNCLEAR_READ[lang])
    if item.category == "other":
        return _flag(index, "unclear", item, messages.UNCLEAR_OTHER[lang])
    if item.category == "excluded":
        return _flag(index, "payable", item, messages.EXCLUDED[lang])

    rule = find_rule(tariffs, item.category, ctx.level)

    # Not registered: only rules that cover every Kenyan apply, and only for an Emergency.
    if not ctx.registered and not (rule and rule.covers_unregistered and ctx.referral == "emergency"):
        return _flag(index, "payable", item, messages.NOT_REGISTERED[lang])
    if rule is None:
        return _flag(index, "payable", item, messages.NO_RULE[lang], rule=None)

    soft = rule.requires_referral and ctx.referral == "neither" and ctx.level >= 4

    if rule.type == "free":
        if item.amount_kes <= 0:
            return _flag(index, "payable", item, messages.NO_CHARGE[lang], tariff=rule.tariff_kes, rule=rule)
        return _flag(index, "should_be_free", item, messages.should_be_free(rule.note(lang), soft, lang),
                     tariff=rule.tariff_kes, in_question=item.amount_kes, rule=rule)

    # max_per_unit: compare the unit price to the Tariff.
    if rule.tariff_kes is None:
        return _flag(index, "payable", item, messages.NO_RULE[lang], rule=None)
    if not _within(item.unit_price_kes * item.quantity, item.amount_kes):
        # quantity × unit price doesn't match the amount, so the unit price can't be trusted.
        return _flag(index, "unclear", item, messages.UNCLEAR_READ[lang])
    if item.unit_price_kes > rule.tariff_kes:
        in_question = round((item.unit_price_kes - rule.tariff_kes) * item.quantity)
        message = messages.above_tariff(ctx.level, rule.tariff_kes, item.unit_price_kes, rule.unit, soft, lang)
        return _flag(index, "above_tariff", item, message, charged=item.unit_price_kes,
                     tariff=rule.tariff_kes, in_question=in_question, rule=rule)
    message = messages.within_tariff(ctx.level, rule.tariff_kes, item.unit_price_kes, rule.unit, lang)
    return _flag(index, "payable", item, message, charged=item.unit_price_kes, tariff=rule.tariff_kes, rule=rule)


def evaluate(bill: Bill, tariffs: list[Tariff], ctx: BillContext) -> list[Flag]:
    return [flag_line_item(i, item, tariffs, ctx) for i, item in enumerate(bill.line_items)]


def amount_in_question(flags: list[Flag], balance_kes: int) -> int:
    """Sum of Flagged amounts, capped at what the Patient is asked to pay."""
    return min(sum(f.amount_in_question_kes for f in flags), max(balance_kes, 0))


@dataclass(frozen=True)
class ReportDraft:
    service_category: str
    paid: bool
    amount_kes: int | None
    flag: FlagType


def verified_reports(bill: Bill, flags: list[Flag]) -> list[ReportDraft]:
    """One Coverage Report per Service Category found on the Bill."""
    by_category: dict[str, list[tuple[LineItem, Flag]]] = {}
    for flag in flags:
        if flag.service_category:
            by_category.setdefault(flag.service_category, []).append((bill.line_items[flag.line_item_index], flag))

    drafts = []
    for category, pairs in by_category.items():
        charged = min(sum(item.amount_kes for item, _ in pairs), max(bill.balance_kes, 0))
        worst = max((f.flag for _, f in pairs), key=FLAG_SEVERITY.__getitem__)
        drafts.append(ReportDraft(category, paid=charged > 0, amount_kes=charged or None, flag=worst))
    return drafts
