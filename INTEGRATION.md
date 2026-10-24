# Haki Afya: frontend integration guide

For whoever builds `frontend/` (human or Claude Code). **`document.md` section 9 is the binding API contract**; this file is the practical guide to using it: types, call order per journey, and what the frontend must do itself. Use the exact terms in `GLOSSARY.md` in code and UI text (Coverage Report, Service Category, Flag, Bill, Line Item…).

---

## 1. Running against the backend

```bash
cd backend
python -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload --port 8000     # needs GEMINI_API_KEY in ../.env for Gemma calls
```

- **Dev:** proxy `/api` to the backend so all calls are same-origin, exactly like production:
  ```ts
  // vite.config.ts
  export default defineConfig({ server: { proxy: { "/api": "http://localhost:8000" } } });
  ```
- **Prod:** FastAPI serves `frontend/dist` from `/` (Render runs `npm ci && npm run build` in `frontend/`). Use relative URLs (`/api/...`), never a hard-coded host. Vite's default `dist/assets/` layout is expected.
- **No CORS, no auth, no cookies.** Identity is an anonymous `device_id` (section 4).
- Without a Gemini key the app still runs: classify returns `matched_by: "fallback"`, Bill Check returns `retake` / `model_error`. Use `?mock=ok` / `?mock=retake` on Bill Check to build the result screens offline.

## 2. TypeScript types

Copy into `frontend/src/api/types.ts`. These match what the backend returns today.

```ts
export type Lang = "en" | "sw";
export type ServiceCategory =
  | "maternity" | "dialysis" | "imaging" | "eye_care"
  | "general_outpatient" | "surgery" | "cancer_care" | "emergency";
export const SERVICE_CATEGORIES: ServiceCategory[] = [
  "maternity", "dialysis", "imaging", "eye_care", "general_outpatient", "surgery", "cancer_care", "emergency",
];
export type Referral = "referred" | "emergency" | "neither";
export type FlagType = "should_be_free" | "above_tariff" | "payable" | "unclear";
export type LineItemCategory =
  | "bed_day" | "normal_delivery" | "caesarean" | "mri" | "ct" | "haemodialysis_session" | "icu_day"
  | "ambulance" | "emergency_care" | "consultation" | "medicine" | "lab_test" | "excluded" | "other";

export interface ApiError { error: { code: "not_found" | "too_large" | "invalid_request" | "rate_limited" | "error"; message: string } }

// POST /api/care-need/classify
export interface ClassifyRequest { text: string; lang: Lang }          // text: 1–500 chars
export interface ClassifyResponse {
  service_category: ServiceCategory | null;                            // null only when matched_by === "fallback"
  is_emergency: boolean;
  matched_by: "keywords" | "model" | "fallback";
}

export interface CoverageCounts {
  window_days: 90;
  verified_paid: number; verified_free: number;
  unverified_paid: number; unverified_free: number;
}

// GET /api/facilities
export interface FacilityCard {
  id: string; name: string; level: number; is_demo: boolean;
  lat: number; lng: number; distance_km: number;
  benefit_summary: string;                                             // already in the requested lang
  coverage: CoverageCounts;                                            // for the requested Service Category
  google: { rating: number; user_rating_count: number } | null;
}
export interface FacilitiesResponse { facilities: FacilityCard[] }    // ≤ 15 km, sorted by distance_km

// GET /api/facilities/search
export interface FacilitySearchResult {
  id: string; name: string; level: number; is_demo: boolean;
  contracted: boolean;                                                 // true = on SHA's list; false = Demo Facility
  contracted_checked_on: string | null;                                // "2026-10-24"
  sha_level: string | null;                                            // "Level 4B" (SHA's label); null for Demo
  type: string | null;                                                 // "HOSPITAL LEVEL 4"
  sub_county: string | null;                                           // "Westlands"
  coverage: CoverageCounts;                                            // all Service Categories, or ?service_category
}
export interface FacilitySearchResponse { facilities: FacilitySearchResult[] }   // max 20

// GET /api/areas
export interface Area { id: string; name: string; lat: number; lng: number }
export interface AreasResponse { areas: Area[] }

// POST /api/bill-check (multipart/form-data)
export interface LineItem {
  description: string; quantity: number; unit_price_kes: number; amount_kes: number;
  category: LineItemCategory; confidence: number;
}
export interface Flag {
  line_item_index: number;                                             // index into bill.line_items
  flag: FlagType;
  tariff_kes: number | null;
  charged_kes: number;                                                 // unit price for per-unit Tariffs, else the line amount
  amount_in_question_kes: number;
  message: string;                                                     // already in the requested lang; show as-is
  rule_id: string | null;
  source_url: string | null;                                           // link "Source" when present
}
export interface ShaContact { channel: string; value: string; source_url: string }
export interface BillCheckOk {
  status: "ok";
  facility: { id: string | null; name: string | null; level: number };   // id/name null for "Not listed"
  bill: { line_items: LineItem[]; subtotal_kes: number; sha_deduction_kes: number; balance_kes: number };
  flags: Flag[];                                                       // exactly one per Line Item, same order
  summary: { amount_in_question_kes: number; balance_kes: number };
  desk_script: string | null;
  complaint_draft: string | null;
  sha_contacts: ShaContact[];
  verified_report_saved: boolean;
  disclaimer: string;                                                  // already in the requested lang
}
export interface BillCheckRetake {
  status: "retake";
  reason: "totals_mismatch" | "low_confidence" | "not_a_bill" | "model_error";
  message: string;                                                     // already in the requested lang
}
export type BillCheckResponse = BillCheckOk | BillCheckRetake;

// POST /api/reports
export interface ReportRequest {
  facility_id: string; service_category: ServiceCategory;
  paid: boolean; amount_kes?: number | null;                           // amount ignored when paid === false
  device_id: string;
}
export interface ReportResponse { id: number; verified: false }       // HTTP 201
```

## 3. Endpoints at a glance

| Call | Typical time | Calls Gemma? | Notes |
|---|---|---|---|
| `GET /api/health` | < 10 ms | no | `{ "ok": true }` |
| `POST /api/care-need/classify` | 5–20 s (keywords: < 10 ms) | yes, unless an Emergency keyword matches | Never errors on Gemma failure: returns `matched_by: "fallback"` |
| `GET /api/facilities?service_category&lat&lng&lang` | < 50 ms | no | Optional Google ratings add up to 3 s |
| `GET /api/facilities/search?q[&service_category]` | < 20 ms | no | Searches all 762 SHA Contracted Facilities + Demo Facilities |
| `GET /api/areas` | < 10 ms | no | 20 Nairobi areas for when location is denied |
| `POST /api/bill-check` | 15–60 s, up to ~80 s worst case | yes, 1–2 calls | Set a **90 s** client timeout and show progress |
| `POST /api/reports` | < 10 ms | no | `201`, `404`, `422` or `429` |

Gemma (`gemma-4-26b-a4b-it` via the Gemini API, about 8 s per call) is sometimes slow and sometimes returns server errors. The backend retries once and then **fails gracefully**: it never returns HTTP 5xx because Gemma failed. Every Gemma failure has a defined fallback (below), so the UI must handle `fallback`, `retake`/`model_error`, and `desk_script: null`.

Errors always have the shape `{"error": {"code", "message"}}`. The `message` is English developer text: **don't show it to Users**. Map `code` to your own EN/SW string.

## 4. Things the frontend owns

1. **`device_id`**: on first load, `crypto.randomUUID()` → `localStorage["haki_device_id"]`. Send it with every Bill Check and Report. It is the only identity; never ask for a name or phone number.
2. **Language**: one EN/SW toggle, saved in `localStorage`. Send `lang` on classify, facilities and Bill Check. Strings the backend returns (`benefit_summary`, Flag `message`, `desk_script`, `complaint_draft`, `disclaimer`, retake `message`) are already in that language; **every other string is yours to provide in both languages.** No Sheng.
3. **Location**: `navigator.geolocation` (HTTPS only). If denied or it fails, show the `/api/areas` picker. Never store coordinates; pass them straight to `/api/facilities`.
4. **Visits**: kept on the device only (`localStorage["haki_visits"]`), shape `{facility_id, facility_name, service_category, created_at, answered: boolean}`. `facility_name` is extra so the prompt can name the facility offline.
5. **Disclaimer**: "Not legal or medical advice" in the footer of every screen, plus the `disclaimer` field on every Bill Check result.
6. **Demo Facilities**: `is_demo: true` → always show a visible **"Demo data"** label on the card, search result and Bill Check result. Never show the "On SHA's contracted list" badge for them (`contracted` is `false`).
7. **Google ratings** (`google` not null): show rating + count with Google attribution ("Rating from Google"). If `null`, show nothing (no empty stars).
8. **Copy / Share**: Desk Script and Complaint Draft get **Copy** (`navigator.clipboard.writeText`) and **Share** (`navigator.share`, fall back to Copy). **Nothing is ever sent automatically.**
9. **Wording**: never "illegal", "fraud", "overcharge", "scam" or accusations in your own UI text. Describe Coverage Reports as patterns: "4 verified reports of paying for maternity", not "this hospital charges".
10. **No medical advice**: the Care Need box only leads to a Service Category. Never echo a condition back ("You have…").

## 5. Journeys

### 5.1 Find (and Emergency)

```
Home ─► Care Need (text or chip) ─► classify ─┬─ is_emergency ─────────────► Emergency screen
                                              ├─ service_category ─────────► location ─► /facilities ─► cards
                                              └─ matched_by "fallback" ────► show the 8 chips, User picks
```

1. User types text → `POST /api/care-need/classify {text, lang}`. While waiting (5–20 s), **show the 8 Service Category chips underneath** so the User can tap one instead of waiting. A chip tap cancels the wait (`AbortController`) and skips classify.
2. Response:
   - `is_emergency: true` (from `keywords` or `model`) → **Emergency screen immediately**, nothing else.
   - `matched_by: "model"` → continue with `service_category`.
   - `matched_by: "fallback"` → "Choose the type of care" + chips.
   - Network error / timeout (set 25 s) → treat as fallback.
3. Tapping the `emergency` chip also goes straight to the Emergency screen.
4. Get coordinates (geolocation, else area picker) → `GET /api/facilities?service_category=…&lat=…&lng=…&lang=…`.
5. Empty `facilities` → "No facilities for this service within 15 km" + "Try another area" (area picker).
6. Card: name, `Level {level}`, `distance_km` km, `benefit_summary`, Coverage badge, Google rating if any, "Demo data" if `is_demo`, **Go here**.
7. **Go here** → save a Visit, then open `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}`.

**Coverage badge** (counts are for the searched Service Category, last 90 days):
- EN: *"{verified_paid} verified · {unverified_paid} unverified reports of paying for {category}"*; SW: *"Ripoti {verified_paid} zilizothibitishwa · {unverified_paid} ambazo hazijathibitishwa za kulipia {category}"*
- Also show the "paid nothing" side (`verified_free`, `unverified_free`) so it reads as a pattern, not an accusation.
- All zeros → "No reports yet" / "Bado hakuna ripoti".

**Emergency screen**: red, the brief's message (section 5.2: *"Go now. SHA's Emergency fund covers the first 24 hours of emergency care for every Kenyan, registered or not."*, with the Swahili version), then `GET /api/facilities?service_category=emergency&lat&lng`, nearest first, each with call-free **Go here**. No other content. ⚠️ The "first 24 hours" claim still needs a checked source (it is not in the tariff extract we have); confirm with the data person before the demo.

### 5.2 "Is this facility contracted with SHA?" (facility lookup)

1. Search box → debounce 250 ms → `GET /api/facilities/search?q=…` (optionally `&service_category=…`).
2. Result with `contracted: true` → badge **"On SHA's contracted list"** + `sha_level`, `type`, `sub_county`, and the checked date (`contracted_checked_on`), plus the Coverage badge (all services unless filtered).
3. Result with `is_demo: true` → "Demo data" label, no contracted badge.
4. **Empty result is NOT "not contracted".** Abbreviations and spellings differ (`knh` finds nothing, `kenyatta` finds KNH). Show exactly:
   - EN: *"We couldn't find this name on SHA's list of contracted facilities in Nairobi (checked {date}). Try the full name, or ask the facility or SHA before you go."*
   - SW: *"Hatukupata jina hili kwenye orodha ya SHA ya vituo vilivyo na mkataba Nairobi (iliangaliwa {date}). Jaribu jina kamili, au uliza kituo au SHA kabla ya kwenda."*
   - `{date}` = `contracted_checked_on` from any earlier result, else "24 Oct 2026".
5. Names are upper case exactly as SHA prints them ("MAMA LUCY KIBAKI HOSPITAL"). Display as-is or with CSS `text-transform: capitalize` on a lower-cased copy; don't rewrite the stored name.
6. Most real facilities don't appear in Find yet (no coordinates/services). That's expected: search is how Users reach them.

### 5.3 Bill Check

```
Facility (search / last Visit / "Not listed" → Level picker 2–6)
  ─► Q1 registered? ─► Q2 referred / emergency / neither ─► photo ─► POST /api/bill-check ─► result or retake
```

1. **Facility**: the same search as 5.2, pre-filled with the most recent Visit's facility. "Not listed" → Level picker (2–6) → send `facility_level`, no `facility_id`.
2. **Questions**: one tap each. Q1 "Is the Patient registered with SHA?" → `registered=true|false`. Q2 "Were you referred here, or was this an emergency?" → `referral=referred|emergency|neither`.
3. **Photo**: `<input type="file" accept="image/*" capture="environment">`. Tips: flat, good light, whole Bill visible. **Resize before upload**: longest side about 1600 px, JPEG quality 0.85 (canvas). This is faster to upload and to read, and stays well under the 8 MB limit (`413 too_large` above it). Never keep the image after the request (no IndexedDB, no cache).
4. **Request** (multipart):
   ```ts
   const form = new FormData();
   form.append("image", blob, "bill.jpg");
   form.append("registered", String(registered));
   form.append("referral", referral);
   form.append("lang", lang);
   form.append("device_id", deviceId);
   if (facilityId) form.append("facility_id", facilityId); else form.append("facility_level", String(level));
   const res = await fetch("/api/bill-check", { method: "POST", body: form, signal: AbortSignal.timeout(90_000) });
   ```
   Show a progress screen with steps ("Reading your bill…", "Checking SHA Tariffs…", "Writing what to say…"). It takes 15–60 s.
5. **`status: "retake"`** → show `message` (already localised) + "Take photo again". The `reason` values are:
   - `totals_mismatch`: the Line Items didn't add up to the total;
   - `low_confidence`: the photo was hard to read;
   - `not_a_bill`: the photo isn't an itemised Bill;
   - `model_error`: Gemma failed. Also offer "Try again" without retaking.

   Client timeout / network error → same as `model_error`.
6. **`status: "ok"`** result screen, top to bottom:
   - **Amount in question**: `summary.amount_in_question_kes` of `summary.balance_kes`, formatted `KES 18,280`. If it is 0 and every Flag is `payable` → **"Looks fair"** / **"Inaonekana sawa"**.
   - **Flag cards**, one per `flags[i]`, using `bill.line_items[flags[i].line_item_index]` for the description and amount: 🔴 `should_be_free`, 🟡 `above_tariff`, 🟢 `payable`, ⚪ `unclear`. Body = `message` as returned. Show `source_url` as a small "Source" link when present. Order 🔴 🟡 ⚪ 🟢 or keep the Bill's order; either is fine.
   - **Desk Script** (if not null) with Copy/Share.
   - **Complaint Draft** (if not null) with Copy/Share, and the `sha_contacts` list (`channel`: `value`). `desk_script`/`complaint_draft` are `null` when nothing needs asking (fair bill), when Gemma failed, or when the backend's wording check rejected the text. Then just show the Flags.
   - Every Flag `payable` and the Patient not registered → show the `sha_contacts` (USSD `*147#`, toll-free) as "How to register with SHA".
   - `disclaimer` at the bottom, always.
7. `verified_report_saved: true` → small note "Your check was added (anonymously) to this facility's Coverage Reports." Mark the matching Visit as answered (the Verified Report replaces the follow-up).

### 5.4 Report (Visit follow-up)

1. On app open: find the oldest Visit with `answered === false` and `created_at` ≥ 2 hours ago → modal: *"Did you pay anything for {category} at {facility_name}?"* / *"Ulilipa chochote kwa {category} katika {facility_name}?"*
2. Buttons:
   - **No** → `POST /api/reports {facility_id, service_category, paid: false, device_id}`.
   - **Yes** → amount field (KES, integer ≥ 0, optional) → `POST /api/reports {…, paid: true, amount_kes}`.
   - **Check my bill** → Bill Check with this facility pre-filled (that produces a Verified Report).
   - **Skip** → mark answered, never ask again.
3. Responses:
   - `201` → thank-you note, mark answered.
   - `429 rate_limited` → mark answered and show "You already reported this facility for this service recently." (EN/SW).
   - `404` → mark answered silently (the facility left SHA's list).
   - Network error → keep the Visit and ask again next time.
4. One prompt per app open, at most.

## 6. Data facts the UI depends on

- **Facilities**: 762 real Nairobi Contracted Facilities from SHA's list (search only, until someone adds coordinates and services), plus 20 **Demo Facilities** (`d001`–`d020`, all with "Demo" in the name) spread across the 20 areas, so Find and the Emergency screen return results anywhere in Nairobi. Demo Coverage Reports are invented and exist **only** on Demo Facilities.
- **Demo story**: from Kilimani, maternity → *Demo Hospital Kilimani* (0.7 km) shows 4 verified · 2 unverified reports of paying; *Demo Health Centre Kibera* (1.9 km) shows mostly "paid nothing". Demo data resets on every restart/redeploy (SQLite is re-seeded), and real Users' reports reset too.
- **Tariffs**: delivery, caesarean, inpatient bed-days (Levels 3–6), dialysis, ICU and ambulance are checked. Other Line Items (consultation, lab, medicine, MRI/CT…) come back 🟢 `payable` with "We have no SHA Tariff for this item…".
- **Emergency keywords** (`data/emergency_keywords.json`) are still empty, so today Emergency detection depends on Gemma. Once filled, keyword hits return in milliseconds with `matched_by: "keywords"`.
- **Google ratings** are off (no `GOOGLE_PLACES_API_KEY`): `google` is always `null`.

## 7. Testing checklist for the frontend

- [ ] `?mock=ok` and `?mock=retake` render both Bill Check screens.
- [ ] Classify fallback: stop the backend's key (or abort) → chips appear, no dead end.
- [ ] Location denied → area picker → results.
- [ ] Emergency chip and an emergency sentence both go straight to the Emergency screen.
- [ ] Search "mama lucy" → contracted badge; search "knh" → the not-found wording above, **not** "not contracted".
- [ ] Bill Check with "Not listed" → Level picker → result, no "added to Coverage Reports" note.
- [ ] Desk Script / Complaint Draft `null` → result still complete.
- [ ] 90 s timeout → retake screen with "Try again".
- [ ] Report `429` handled; Visit prompt never repeats after Skip or an answer.
- [ ] Every string in EN and SW; "Demo data" label on every Demo Facility surface.
- [ ] Works one-handed on a phone over HTTPS (camera + location).
