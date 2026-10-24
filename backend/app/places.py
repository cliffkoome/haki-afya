"""Optional Google ratings for facility cards (Places API (New): rating, userRatingCount only).

Off unless GOOGLE_PLACES_API_KEY is set. Any failure returns None, so the
card shows no rating. Hard cut-off: drop it at 6:00 PM if not working.
"""

import logging
import os
import time

import httpx

log = logging.getLogger(__name__)

TIMEOUT_S = 3
CACHE_TTL_S = 30 * 60  # short in-memory cache to keep per-request API cost down
_cache: dict[str, tuple[float, dict | None]] = {}


def enabled() -> bool:
    return bool(os.environ.get("GOOGLE_PLACES_API_KEY"))


async def rating(client: httpx.AsyncClient, place_id: str | None) -> dict | None:
    if not place_id or not enabled():
        return None
    hit = _cache.get(place_id)
    if hit and time.monotonic() - hit[0] < CACHE_TTL_S:
        return hit[1]
    try:
        r = await client.get(
            f"https://places.googleapis.com/v1/places/{place_id}",
            headers={"X-Goog-Api-Key": os.environ["GOOGLE_PLACES_API_KEY"], "X-Goog-FieldMask": "rating,userRatingCount"},
            timeout=TIMEOUT_S,
        )
        r.raise_for_status()
        body = r.json()
    except (httpx.HTTPError, ValueError) as e:
        log.warning("Places lookup failed for %s: %r", place_id, e)
        return None  # don't cache failures
    result = None
    if body.get("rating") is not None:
        result = {"rating": body["rating"], "user_rating_count": body.get("userRatingCount", 0)}
    _cache[place_id] = (time.monotonic(), result)
    return result
