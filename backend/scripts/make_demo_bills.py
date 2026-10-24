"""Generate the SAMPLE demo bills in demo/ and the expected-results table in demo/README.md.

Run from backend/:  python scripts/make_demo_bills.py

Every bill is invented, is issued by a Demo Facility (is_demo = true) and says SAMPLE on it.
Expected results are computed by the real rules engine over data/tariffs.json, so they stay
in step with the data. Gemma's read of a photo can still differ; re-test after changing a bill.
"""

import random
import sys
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app import data, rules  # noqa: E402
from app.models import Bill, LineItem  # noqa: E402

FONTS = Path("C:/Windows/Fonts")


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONTS / name), size)


@dataclass
class Item:
    text: str
    qty: int
    unit: int
    category: str  # what a careful reader would file it under (used for the expected result)

    @property
    def amount(self) -> int:
        return self.qty * self.unit


@dataclass
class Sample:
    file: str
    title: str
    style: str  # thermal | invoice | statement | clinic | photo
    facility_id: str
    ref: str
    date: str
    items: list[Item]
    sha_deduction: int
    registered: bool
    referral: str
    shows: str  # one line for the README

    @property
    def subtotal(self) -> int:
        return sum(i.amount for i in self.items)

    @property
    def balance(self) -> int:
        return self.subtotal - self.sha_deduction


SAMPLES = [
    Sample("sample-1-delivery.jpg", "Normal delivery, ward above Tariff", "thermal", "d001", "DEMO-0001", "24/10/2026",
           [Item("Normal delivery package", 1, 15000, "normal_delivery"),
            Item("Ward (2 days)", 2, 5000, "bed_day"),
            Item("Multivitamin", 1, 800, "excluded")],
           0, True, "neither",
           "The headline demo: 🔴 delivery, 🟡 ward, 🟢 supplements. Matches the brief's KES 18,280 example."),
    Sample("sample-2-fair.jpg", "A fair bill", "invoice", "d002", "DEMO-0002", "24/10/2026",
           [Item("Consultation", 1, 500, "consultation"),
            Item("Laboratory: full blood count, malaria test", 1, 1200, "lab_test"),
            Item("Pharmacy: antibiotics, pain relief", 1, 850, "medicine"),
            Item("Ward bed charge (2 days)", 2, 2240, "bed_day")],
           4480, True, "referred",
           "Every Line Item 🟢 and \"Looks fair\". Shows the app is for accuracy, not against facilities."),
    Sample("sample-3-caesarean.jpg", "Caesarean, ward above Tariff, private room", "statement", "d006", "DEMO-0003",
           "24/10/2026",
           [Item("Caesarean section package", 1, 48000, "caesarean"),
            Item("General ward (3 days)", 3, 4800, "bed_day"),
            Item("Private room upgrade (3 days)", 3, 2000, "excluded"),
            Item("Take-home medicines", 1, 2350, "medicine")],
           0, True, "referred",
           "Level 5. 🔴 caesarean, 🟡 ward, 🟢 private room (excluded) and medicines. Largest amount in question."),
    Sample("sample-4-dialysis.jpg", "Dialysis sessions and ambulance above Tariff", "clinic", "d008", "DEMO-0004",
           "24/10/2026",
           [Item("Haemodialysis session", 3, 13500, "haemodialysis_session"),
            Item("Nephrologist consultation", 1, 3000, "consultation"),
            Item("Pre-dialysis laboratory panel", 1, 2800, "lab_test"),
            Item("Ambulance transfer", 1, 7000, "ambulance")],
           0, True, "referred",
           "Not maternity: 🟡 dialysis (per session) and 🟡 ambulance, with a quantity above 1."),
    Sample("sample-5-messy-photo.jpg", "Hard photo with an unclear line", "photo", "d007", "DEMO-0005", "24/10/2026",
           [Item("Ward bed charge (2 days)", 2, 3360, "bed_day"),
            Item("Misc charge (code 77B)", 1, 9500, "other"),
            Item("Doctor consultation", 1, 2000, "consultation"),
            Item("Pharmacy", 1, 1640, "medicine")],
           0, True, "referred",
           "Tilted, dim, slightly blurred photo of a receipt. ⚪ Unclear for the coded line; ward within Tariff is 🟢. "
           "Also the best bill to show the retake path if the read fails."),
]

INK = (28, 28, 30)
GREY = (110, 110, 115)


def money(n: int) -> str:
    return f"{n:,}"


def banner(d: ImageDraw.ImageDraw, w: int, y: int, size: int = 20) -> int:
    f = font("arialbd.ttf", size)
    d.rectangle([0, y, w, y + size + 14], fill=(255, 236, 160))
    d.text((w // 2, y + 7), "SAMPLE BILL - DEMO DATA - NOT A REAL BILL", font=f, fill=(90, 60, 0), anchor="mt")
    return y + size + 14


def render_thermal(s: Sample, name: str) -> Image.Image:
    w = 620
    f, fb = font("consola.ttf", 24), font("consolab.ttf", 24)
    big = font("consolab.ttf", 30)
    h = 520 + 90 * len(s.items)
    img = Image.new("RGB", (w, h), (252, 251, 247))
    d = ImageDraw.Draw(img)
    y = banner(d, w, 0, 18) + 24
    d.text((w // 2, y), name.upper(), font=big, fill=INK, anchor="mt"); y += 44
    d.text((w // 2, y), "Patient Billing Desk", font=f, fill=INK, anchor="mt"); y += 34
    d.text((30, y), f"Date: {s.date}", font=f, fill=INK); y += 30
    d.text((30, y), f"Bill No: {s.ref}", font=f, fill=INK); y += 30
    d.text((30, y), "Patient: DEMO PATIENT", font=f, fill=INK); y += 36
    d.text((30, y), "-" * 40, font=f, fill=INK); y += 30
    d.text((30, y), "ITEM", font=fb, fill=INK)
    d.text((w - 30, y), "KES", font=fb, fill=INK, anchor="ra"); y += 34
    for i in s.items:
        d.text((30, y), i.text[:30], font=f, fill=INK)
        d.text((w - 30, y), money(i.amount), font=f, fill=INK, anchor="ra"); y += 30
        if i.qty > 1:
            d.text((50, y), f"{i.qty} x {money(i.unit)}", font=f, fill=GREY); y += 30
        y += 14
    d.text((30, y), "-" * 40, font=f, fill=INK); y += 30
    for label, val, bold in (("TOTAL", s.subtotal, True), ("SHA DEDUCTION", s.sha_deduction, False),
                             ("BALANCE DUE", s.balance, True)):
        d.text((30, y), label, font=fb if bold else f, fill=INK)
        d.text((w - 30, y), money(val), font=fb if bold else f, fill=INK, anchor="ra"); y += 36
    d.text((w // 2, y + 20), "Thank you", font=f, fill=GREY, anchor="mt")
    return img.crop((0, 0, w, y + 70))


def table(d: ImageDraw.ImageDraw, s: Sample, x0: int, x1: int, y: int, head_fill, head_ink, rule) -> int:
    fh, f = font("arialbd.ttf", 24), font("arial.ttf", 24)
    cols = [x0, x0 + 520, x0 + 620, x0 + 790, x1]
    d.rectangle([x0, y, x1, y + 44], fill=head_fill)
    for label, cx, anc in (("Description", cols[0] + 14, "la"), ("Qty", cols[2] - 14, "ra"),
                           ("Unit price", cols[3] - 14, "ra"), ("Amount (KES)", cols[4] - 14, "ra")):
        d.text((cx, y + 9), label, font=fh, fill=head_ink, anchor=anc)
    y += 44
    for n, i in enumerate(s.items):
        if n % 2:
            d.rectangle([x0, y, x1, y + 48], fill=(246, 246, 248))
        d.text((cols[0] + 14, y + 11), i.text, font=f, fill=INK)
        d.text((cols[2] - 14, y + 11), str(i.qty), font=f, fill=INK, anchor="ra")
        d.text((cols[3] - 14, y + 11), money(i.unit), font=f, fill=INK, anchor="ra")
        d.text((cols[4] - 14, y + 11), money(i.amount), font=f, fill=INK, anchor="ra")
        y += 48
    d.line([x0, y, x1, y], fill=rule, width=2)
    return y


def totals(d: ImageDraw.ImageDraw, s: Sample, x1: int, y: int) -> int:
    fb, f = font("arialbd.ttf", 26), font("arial.ttf", 26)
    for label, val, bold in (("Total charges", s.subtotal, False), ("SHA deduction", s.sha_deduction, False),
                             ("Balance to pay", s.balance, True)):
        d.text((x1 - 330, y + 14), label, font=fb if bold else f, fill=INK)
        d.text((x1 - 14, y + 14), money(val), font=fb if bold else f, fill=INK, anchor="ra"); y += 44
    return y


def render_invoice(s: Sample, name: str) -> Image.Image:
    w = 1000
    img = Image.new("RGB", (w, 900 + 50 * len(s.items)), "white")
    d = ImageDraw.Draw(img)
    y = banner(d, w, 0) + 30
    d.text((50, y), name, font=font("arialbd.ttf", 40), fill=(10, 90, 70)); y += 56
    d.text((50, y), "OUTPATIENT AND WARD INVOICE", font=font("arial.ttf", 24), fill=GREY); y += 50
    d.text((50, y), f"Invoice no: {s.ref}", font=font("arial.ttf", 24), fill=INK)
    d.text((w - 50, y), f"Date: {s.date}", font=font("arial.ttf", 24), fill=INK, anchor="ra"); y += 36
    d.text((50, y), "Patient: DEMO PATIENT     Payer: SHA / patient", font=font("arial.ttf", 24), fill=INK); y += 56
    y = table(d, s, 50, w - 50, y, (10, 90, 70), "white", (10, 90, 70))
    y = totals(d, s, w - 50, y)
    d.text((50, y + 40), "Payment due at discharge. Receipt issued on payment.", font=font("ariali.ttf", 22), fill=GREY)
    return img.crop((0, 0, w, y + 100))


def render_statement(s: Sample, name: str) -> Image.Image:
    w = 1100
    img = Image.new("RGB", (w, 1000 + 50 * len(s.items)), (255, 255, 252))
    d = ImageDraw.Draw(img)
    d.rectangle([10, 10, w - 10, 1000 + 50 * len(s.items) - 10], outline=(150, 40, 40), width=3)
    y = banner(d, w, 12) + 30
    d.text((w // 2, y), name.upper(), font=font("arialbd.ttf", 38), fill=(150, 40, 40), anchor="mt"); y += 58
    d.text((w // 2, y), "DISCHARGE BILL STATEMENT", font=font("arialbd.ttf", 26), fill=INK, anchor="mt"); y += 54
    f = font("arial.ttf", 24)
    d.text((60, y), f"Bill ref: {s.ref}", font=f, fill=INK)
    d.text((w - 60, y), f"Discharge date: {s.date}", font=f, fill=INK, anchor="ra"); y += 36
    d.text((60, y), "Patient: DEMO PATIENT     Ward: Maternity     Admission: 3 days", font=f, fill=INK); y += 56
    y = table(d, s, 60, w - 60, y, (150, 40, 40), "white", (150, 40, 40))
    y = totals(d, s, w - 60, y)
    d.ellipse([70, y + 20, 250, y + 200], outline=(40, 70, 160), width=5)
    d.text((160, y + 110), "PAID\nDEMO", font=font("arialbd.ttf", 34), fill=(40, 70, 160), anchor="mm", align="center")
    return img.crop((0, 0, w, y + 260))


def render_clinic(s: Sample, name: str) -> Image.Image:
    w = 1000
    img = Image.new("RGB", (w, 900 + 50 * len(s.items)), (248, 251, 255))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, w, 150], fill=(30, 70, 140))
    y = banner(d, w, 0) + 22
    d.text((50, y), name, font=font("calibrib.ttf", 42), fill="white"); y += 54
    d.text((50, y), "Renal care and haemodialysis unit", font=font("calibri.ttf", 26), fill=(205, 220, 245))
    y = 190
    f = font("calibri.ttf", 26)
    d.text((50, y), f"Statement {s.ref}", font=f, fill=INK)
    d.text((w - 50, y), f"Date {s.date}", font=f, fill=INK, anchor="ra"); y += 40
    d.text((50, y), "Patient: DEMO PATIENT     Course: dialysis, 3 sessions this month", font=f, fill=INK); y += 56
    y = table(d, s, 50, w - 50, y, (30, 70, 140), "white", (30, 70, 140))
    y = totals(d, s, w - 50, y)
    return img.crop((0, 0, w, y + 90))


def render_photo(s: Sample, name: str) -> Image.Image:
    rnd = random.Random(7)
    receipt = render_thermal(s, name)
    bw, bh = receipt.size
    desk = Image.new("RGB", (bw + 360, bh + 300), (92, 70, 52))
    dd = ImageDraw.Draw(desk)
    for _ in range(900):  # wood grain
        x = rnd.randint(0, desk.width)
        dd.line([x, 0, x + rnd.randint(-8, 8), desk.height], fill=(rnd.randint(70, 110),) * 1 + (55, 38), width=1)
    shadow = Image.new("RGBA", desk.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rectangle([200, 190, 200 + bw, 190 + bh], fill=(0, 0, 0, 150))
    desk = Image.alpha_composite(desk.convert("RGBA"), shadow.filter(ImageFilter.GaussianBlur(18))).convert("RGB")
    rot = receipt.convert("RGBA").rotate(-4, expand=True, resample=Image.BICUBIC, fillcolor=(0, 0, 0, 0))
    desk.paste(rot, (170, 120), rot)
    # uneven light: darker toward one corner
    grad = Image.new("L", desk.size)
    gd = ImageDraw.Draw(grad)
    for x in range(desk.width):
        gd.line([x, 0, x, desk.height], fill=int(255 - 85 * x / desk.width))
    desk = Image.composite(desk, Image.new("RGB", desk.size, (20, 18, 16)), grad)
    desk = desk.filter(ImageFilter.GaussianBlur(0.9))
    px = desk.load()
    for _ in range(desk.width * desk.height // 40):  # sensor grain
        x, y = rnd.randrange(desk.width), rnd.randrange(desk.height)
        v = rnd.randint(-16, 16)
        r, g, b = px[x, y]
        px[x, y] = (max(0, min(255, r + v)), max(0, min(255, g + v)), max(0, min(255, b + v)))
    return desk


RENDER = {"thermal": render_thermal, "invoice": render_invoice, "statement": render_statement,
          "clinic": render_clinic, "photo": render_photo}

FLAG_ICON = {"should_be_free": "🔴 Should Be Free", "above_tariff": "🟡 Above Tariff",
             "payable": "🟢 Payable", "unclear": "⚪ Unclear"}


def expected(s: Sample, store: data.Store) -> tuple[list, int]:
    facility = store.facilities[s.facility_id]
    assert facility.is_demo, f"{s.file}: bills must come from a Demo Facility"
    bill = Bill(
        line_items=[LineItem(description=i.text, quantity=i.qty, unit_price_kes=i.unit, amount_kes=i.amount,
                             category=i.category, confidence=0.95) for i in s.items],
        subtotal_kes=s.subtotal, sha_deduction_kes=s.sha_deduction, balance_kes=s.balance)
    ctx = rules.BillContext(level=facility.level, registered=s.registered, referral=s.referral, lang="en")
    flags = rules.evaluate(bill, store.tariffs, ctx)
    return flags, rules.amount_in_question(flags, bill.balance_kes)


def main() -> None:
    store = data.load()
    out = ROOT / "demo"
    out.mkdir(exist_ok=True)
    rows, details = [], []
    for s in SAMPLES:
        facility = store.facilities[s.facility_id]
        img = RENDER[s.style](s, facility.name)
        img.convert("RGB").save(out / s.file, quality=90)
        flags, in_question = expected(s, store)
        rows.append(f"| `{s.file}` | {facility.name} (Level {facility.level}) | {money(s.balance)} | "
                    f"**{money(in_question)}** | {s.shows} |")
        lines = [f"### `{s.file}`: {s.title}", "",
                 f"Facility: **{facility.name}** (`{s.facility_id}`, Level {facility.level}). "
                 f"Answers to give: registered **{'Yes' if s.registered else 'No'}**, "
                 f"referral **{s.referral.capitalize()}**.", "",
                 "| Line Item | Qty x unit | Amount | Expected Flag | In question |", "|---|---|---|---|---|"]
        for item, f in zip(s.items, flags):
            lines.append(f"| {item.text} | {item.qty} x {money(item.unit)} | {money(item.amount)} | "
                         f"{FLAG_ICON[f.flag]} | {money(f.amount_in_question_kes)} |")
        lines += ["", f"Total {money(s.subtotal)} · SHA deduction {money(s.sha_deduction)} · "
                      f"balance {money(s.balance)} · **amount in question {money(in_question)}**.", ""]
        details.append("\n".join(lines))
        print(f"{s.file}: in question {in_question}")

    readme = f"""# Demo bills

Five invented SAMPLE bills for the demo. Each one says **SAMPLE BILL - DEMO DATA** on it and comes from a
**Demo Facility** (`is_demo = true`), so no real facility is ever shown a made-up charge.

Regenerate with `python scripts/make_demo_bills.py` from `backend/`. The tables below are computed by the
real rules engine over `data/tariffs.json`, so if a Tariff changes, regenerate and re-check.

> **Caveat.** The Tariffs these bills exercise are only as good as `data/tariffs.json`. Check each rule
> against its `source_url` before the demo. `research.md` section 4.4 lists figures that conflict or could
> not be confirmed (delivery and caesarean by level, ICU, CT). These samples avoid ICU and CT on purpose.
> Gemma's read of a photo may differ from the expected result; try every bill on the live app before the pitch.

| File | Facility | Balance (KES) | Expected in question (KES) | What it shows |
|---|---|---|---|---|
{chr(10).join(rows)}

## Suggested demo order

1. `sample-1-delivery.jpg`: the main story.
2. `sample-2-fair.jpg`: "Looks fair", so the room sees the app is not one-sided.
3. `sample-3-caesarean.jpg` or `sample-4-dialysis.jpg`: breadth beyond a single service.
4. `sample-5-messy-photo.jpg`: robustness, and the Unclear Flag. Keep it as the retake demo if the read fails.

## Expected results

{chr(10).join(details)}
"""
    (out / "README.md").write_text(readme, encoding="utf-8")
    print("wrote", out / "README.md")


if __name__ == "__main__":
    main()
