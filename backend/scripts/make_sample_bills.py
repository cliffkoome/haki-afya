"""Render the SAMPLE Bill images in tests/fixtures/bills/ from tests/journey_bills.py.

    pip install pillow   # not a backend dependency; only needed to re-render
    python scripts/make_sample_bills.py

Every image says SAMPLE BILL and uses a Demo Facility name.
"""

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import data  # noqa: E402
from tests.journey_bills import BILLS, FIXTURES  # noqa: E402

SANS = "/usr/share/fonts/TTF/DejaVuSans.ttf"
MONO = "/usr/share/fonts/TTF/DejaVuSansMono.ttf"


def render(name: str, facility_name: str, level: int, items, subtotal: int, sha: int, balance: int) -> None:
    head, sub, mono, bold = (ImageFont.truetype(SANS, 34), ImageFont.truetype(SANS, 20),
                             ImageFont.truetype(MONO, 22), ImageFont.truetype(MONO, 24))
    img = Image.new("RGB", (1000, 560 + 44 * len(items)), "white")
    d = ImageDraw.Draw(img)
    d.text((40, 30), facility_name.upper(), font=head, fill="black")
    d.text((40, 75), f"Level {level} · P.O. Box 00000 Nairobi · SAMPLE BILL FOR TESTING", font=sub, fill="#444")
    d.text((40, 110), "INTERIM BILL / INVOICE      Patient: [SAMPLE]      Date: 24/10/2026", font=sub, fill="black")
    y = 170
    d.text((40, y), f"{'DESCRIPTION':<34}{'QTY':>5}{'UNIT':>11}{'AMOUNT':>12}", font=bold, fill="black")
    y += 36
    d.line((40, y, 960, y), fill="black", width=2)
    y += 12
    for desc, qty, unit, amount, _category in items:
        d.text((40, y), f"{desc:<34}{qty:>5}{unit:>11,}{amount:>12,}", font=mono, fill="black")
        y += 44
    d.line((40, y, 960, y), fill="black", width=2)
    y += 20
    for label, value in (("SUBTOTAL", subtotal), ("LESS SHA", sha), ("BALANCE DUE (KES)", balance)):
        d.text((40, y), f"{label:>50}{value:>12,}", font=bold, fill="black")
        y += 40
    img.save(FIXTURES / f"{name}.jpg", quality=88)


def main() -> None:
    FIXTURES.mkdir(parents=True, exist_ok=True)
    facilities = data.load().facilities
    for name, (facility_id, items, subtotal, sha, balance) in BILLS.items():
        f = facilities[facility_id]
        render(name, f.name, f.level, items, subtotal, sha, balance)
    # Not a Bill: a simple drawing.
    img = Image.new("RGB", (900, 600), "#9fd3ff")
    d = ImageDraw.Draw(img)
    d.ellipse((620, 60, 760, 200), fill="#ffd34d")
    d.rectangle((0, 420, 900, 600), fill="#4caf50")
    d.polygon([(150, 420), (300, 220), (450, 420)], fill="#7b5b3a")
    img.save(FIXTURES / "not_a_bill.jpg")
    print(f"Wrote {len(BILLS) + 1} images to {FIXTURES}")


if __name__ == "__main__":
    main()
