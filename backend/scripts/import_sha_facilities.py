"""Import SHA's list of Contracted Facilities in Nairobi into data/facilities.csv.

    python scripts/import_sha_facilities.py                  # fetch from sha.go.ke
    python scripts/import_sha_facilities.py saved_page.html  # or use a saved copy

Merges by id: Demo Facilities and anything filled in by hand for an existing
facility (lat, lng, service_categories, google_place_id) are kept. Facilities
no longer on SHA's list are dropped, so the file only ever says "contracted"
when SHA does.
"""

import csv
import re
import sys
import urllib.request
from datetime import date
from html.parser import HTMLParser
from pathlib import Path

SOURCE_URL = "https://www.sha.go.ke/contracted-facilities-nairobi/"
FACILITIES_CSV = Path(__file__).resolve().parents[2] / "data" / "facilities.csv"
COLUMNS = ["id", "name", "level", "lat", "lng", "service_categories", "google_place_id", "is_demo",
           "source_url", "checked_on", "sha_registration_no", "sha_level", "type", "sub_county"]
KEEP_BY_HAND = ["lat", "lng", "service_categories", "google_place_id"]


class _Table(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows: list[list[str]] = []
        self._row: list[str] | None = None
        self._cell: list[str] | None = None

    def handle_starttag(self, tag, attrs):
        if tag == "tr":
            self._row = []
        elif tag in ("td", "th") and self._row is not None:
            self._cell = []

    def handle_endtag(self, tag):
        if tag in ("td", "th") and self._cell is not None:
            self._row.append(re.sub(r"\s+", " ", "".join(self._cell)).strip())
            self._cell = None
        elif tag == "tr" and self._row is not None:
            if self._row:
                self.rows.append(self._row)
            self._row = None

    def handle_data(self, data):
        if self._cell is not None:
            self._cell.append(data)


def facility_id(registration_no: str) -> str:
    return "sha-" + re.sub(r"[^a-z0-9]+", "-", registration_no.lower()).strip("-")


def level_number(sha_level: str) -> int:
    """'LEVEL 3B' -> 3, 'LEVEL 6A' -> 6. Tariffs are set per whole Level."""
    m = re.fullmatch(r"LEVEL ([2-6])[AB]?", sha_level.strip().upper())
    if not m:
        raise ValueError(f"unexpected level {sha_level!r}")
    return int(m.group(1))


def read_sha_rows(html: str) -> list[dict]:
    table = _Table()
    table.feed(html)
    header, *rows = table.rows
    expected = ["Registration No.", "Name", "Address", "Beds", "Type", "Level", "County", "Sub County",
                "Regulator", "Category"]
    if header != expected:
        raise SystemExit(f"SHA table columns changed, check the page by hand: {header}")
    return [dict(zip(header, r)) for r in rows]


def main() -> None:
    if len(sys.argv) > 1:
        html = Path(sys.argv[1]).read_text(encoding="utf-8")
    else:
        req = urllib.request.Request(SOURCE_URL, headers={"User-Agent": "Mozilla/5.0 (haki-afya importer)"})
        html = urllib.request.urlopen(req, timeout=60).read().decode("utf-8")

    with FACILITIES_CSV.open(newline="", encoding="utf-8") as f:
        existing = {row["id"]: row for row in csv.DictReader(f)}

    today = date.today().isoformat()
    out = [row for row in existing.values() if row.get("is_demo", "").strip().lower() == "true"]
    seen = set()
    for r in read_sha_rows(html):
        if r["County"].strip().upper() != "NAIROBI":
            continue
        fid = facility_id(r["Registration No."])
        if fid in seen:
            raise SystemExit(f"two SHA rows map to id {fid}")
        seen.add(fid)
        old = existing.get(fid, {})
        out.append({
            "id": fid,
            "name": r["Name"],
            "level": level_number(r["Level"]),
            "is_demo": "false",
            "source_url": SOURCE_URL,
            "checked_on": today,
            "sha_registration_no": r["Registration No."],
            "sha_level": r["Level"].title(),
            "type": r["Type"],
            "sub_county": r["Sub County"].title(),
            **{k: old.get(k, "") for k in KEEP_BY_HAND},
        })

    with FACILITIES_CSV.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNS, extrasaction="ignore")
        writer.writeheader()
        for row in out:
            writer.writerow({k: row.get(k, "") for k in COLUMNS})
    dropped = [fid for fid, row in existing.items() if fid not in seen and row.get("is_demo", "").lower() != "true"]
    print(f"Wrote {len(out)} facilities ({len(seen)} from SHA's list) to {FACILITIES_CSV}")
    if dropped:
        print(f"Dropped {len(dropped)} no longer on SHA's list: {', '.join(dropped)}")


if __name__ == "__main__":
    main()
