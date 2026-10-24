"""SQLite, re-seeded from data/ on every start (document.md section 8).

Tables follow the brief exactly. There is no table for Bills: they are never
stored. The database is in memory by default (it resets on restart anyway);
set HAKI_DB_PATH to use a file.
"""

import os
import sqlite3
import threading
from datetime import datetime, timedelta, timezone

from app.data import Store, utc_iso

COVERAGE_WINDOW_DAYS = 90
RATE_LIMIT_DAYS = 30

SCHEMA = """
DROP TABLE IF EXISTS facilities;
DROP TABLE IF EXISTS coverage_reports;
CREATE TABLE facilities(
    id TEXT PRIMARY KEY, name TEXT, level INT, lat REAL, lng REAL,
    service_categories TEXT, google_place_id TEXT, is_demo INT
);
CREATE TABLE coverage_reports(
    id INTEGER PRIMARY KEY, facility_id TEXT, service_category TEXT,
    paid INT, amount_kes INT NULL, verified INT,
    flag TEXT NULL, device_id TEXT, created_at TEXT
);
CREATE INDEX coverage_by_facility ON coverage_reports(facility_id, service_category, created_at);
"""

_conn: sqlite3.Connection | None = None
_lock = threading.Lock()


class RateLimited(Exception):
    pass


def _since(days: int) -> str:
    return utc_iso((datetime.now(timezone.utc) - timedelta(days=days)).isoformat())


def init(store: Store) -> None:
    global _conn
    if _conn is not None:
        _conn.close()
    _conn = sqlite3.connect(os.environ.get("HAKI_DB_PATH", ":memory:"), check_same_thread=False)
    with _lock, _conn:
        _conn.executescript(SCHEMA)
        _conn.executemany(
            "INSERT INTO facilities VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [(f.id, f.name, f.level, f.lat, f.lng, ";".join(f.service_categories), f.google_place_id, int(f.is_demo))
             for f in store.facilities.values()],
        )
        # load_demo_reports has already rejected any row not on a Demo Facility.
        _conn.executemany(
            "INSERT INTO coverage_reports(facility_id, service_category, paid, amount_kes, verified, flag, device_id, created_at)"
            " VALUES (?, ?, ?, ?, ?, ?, 'demo', ?)",
            [(r.facility_id, r.service_category, int(r.paid), r.amount_kes, int(r.verified), r.flag, r.created_at)
             for r in store.demo_reports],
        )


def coverage_counts(facility_id: str, service_category: str | None = None) -> dict:
    """Coverage Reports in the last 90 days, for one Service Category or (None) all of them."""
    with _lock:
        rows = _conn.execute(
            "SELECT verified, paid, COUNT(*) FROM coverage_reports"
            " WHERE facility_id = ? AND (? IS NULL OR service_category = ?) AND created_at >= ?"
            " GROUP BY verified, paid",
            (facility_id, service_category, service_category, _since(COVERAGE_WINDOW_DAYS)),
        ).fetchall()
    counts = {"window_days": COVERAGE_WINDOW_DAYS,
              "verified_paid": 0, "verified_free": 0, "unverified_paid": 0, "unverified_free": 0}
    for verified, paid, n in rows:
        counts[f"{'verified' if verified else 'unverified'}_{'paid' if paid else 'free'}"] = n
    return counts


def add_report(*, facility_id: str, service_category: str, paid: bool, amount_kes: int | None,
               verified: bool, flag: str | None, device_id: str) -> int:
    """Insert a Coverage Report. One per device per facility per Service Category per 30 days."""
    with _lock, _conn:
        recent = _conn.execute(
            "SELECT 1 FROM coverage_reports"
            " WHERE device_id = ? AND facility_id = ? AND service_category = ? AND created_at >= ?",
            (device_id, facility_id, service_category, _since(RATE_LIMIT_DAYS)),
        ).fetchone()
        if recent:
            raise RateLimited
        cur = _conn.execute(
            "INSERT INTO coverage_reports(facility_id, service_category, paid, amount_kes, verified, flag, device_id, created_at)"
            " VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (facility_id, service_category, int(paid), amount_kes, int(verified), flag, device_id, utc_iso()),
        )
        return cur.lastrowid
