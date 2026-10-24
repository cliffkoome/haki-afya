# Haki Afya: Project Brief

> **Read this first.** This is the single source of truth for the build. If the code and this document disagree, this document wins until it is updated. Every term in **Bold Capitals** is defined in [`GLOSSARY.md`](./GLOSSARY.md); use those exact words in code, UI and conversation.

**Event:** Hacktoberfest Hack Day Nairobi x B54 (MLH), Saturday 24 Oct 2026, ends **9:00 PM EAT**
**Prize categories we are entering:** Best Use of Gemma 4 · Best Open-Source AI Project
**Team:** 5 people. 2 devs (1 backend, 1 frontend), 3 non-devs (data, demo assets, pitch)

---

## 1. The problem

Kenyans covered by SHA (Social Health Authority) are regularly asked to pay for care that SHA should cover, and they find out only afterwards, usually by complaining on X.

- MP Shah Hospital was **suspended from SHA in June 2026** after multiple complaints that patients paid for covered services; one patient was billed **KES 83,308**.
- In **October 2026** a patient's viral video about spending ~**KES 150,000** at KNH prompted an internal investigation.
- Reporting describes hospital **claim rejection rates above 38%** and long payment delays, which push facilities to charge patients directly.

The root cause is an **information gap at the moment of payment**: the facility knows what SHA covers; the person at the billing desk does not. Existing tools do not close it:

| Existing tool | What it does | What it does not do |
|---|---|---|
| SHA portal / USSD | Confirms registration | Says whether *this charge on this Bill* is allowed |
| SHA contracted-facility list | Lists **Contracted Facilities** by county | Says which services a facility actually offers, or whether patients actually got them covered |
| Google reviews | General service quality | Anything about SHA cover |
| Complaining on X | Public pressure | Help *before* you pay |

## 2. The solution

Haki Afya covers the whole patient journey in three features:

```
1. FIND (before)            2. BILL CHECK (at the desk)      3. REPORT (after)
Care Need → Service    ──►  Photo of Bill → Flags      ──►  "Did you pay anything?"
Category → nearby            → Desk Script                   → Coverage Report
Contracted Facilities          → Complaint Draft               → improves FIND
        ▲                                                            │
        └──────────────── Coverage Reports loop back ────────────────┘
```

**One-line pitch:** *Photograph your hospital bill and see in 30 seconds what SHA should have covered, and every check makes the map more accurate for the next patient.*

**Why it beats the official list:** the SHA list says a facility is *contracted*. Haki Afya shows whether patients *actually paid nothing* there.

## 3. Objectives and how we win

| Judging angle | How we meet it |
|---|---|
| **Best Use of Gemma 4** | Gemma 4's vision reads the Bill photo (core feature, not a bolt-on chatbot). Gemma also maps Care Needs to Service Categories and writes the bilingual Desk Script and Complaint Draft. |
| **Best Open-Source AI Project** | Open-weight model; public MIT-licensed repo; SHA Tariff rules published as an **open dataset** in `data/`; roadmap to run Gemma locally so Bills never leave the phone or laptop. |
| **Real problem** | Section 1 evidence, all from 2026 news. |
| **Demo** | Photo in, Flags with shilling amounts out in ~30 seconds. Judges scan a QR code and try it on their own phone. |
| **Technical depth** | Pipeline: extract → check the read → classify → deterministic rules. **"AI reads, code decides."** |
| **Trustworthy** | No medical advice, no accusations, Bills never stored, demo data never attached to real hospitals. |

### Priority order (cut from the bottom if time runs out)

1. **Bill Check** (must ship)
2. **Find**
3. **Report** (Visit follow-up + Coverage Report counts)
4. **Google ratings** (hard cut-off: drop it if not working **by 6:00 PM**)

## 4. Users

- **Primary User:** the person at the billing desk, often a **caregiver** (parent, spouse, child) paying for someone else. Stressed, on a phone, little time. Every screen must be usable one-handed in under 10 seconds.
- **Geography:** **Nairobi only** for the hackathon.
- **Languages:** **English and Swahili** toggle for all UI and all AI output. No Sheng.
- **No accounts.** An anonymous device ID (random UUID in `localStorage`) is the only identity.

## 5. Hard rules (non-negotiable)

1. **No medical advice.** The app never names a condition, diagnosis or treatment. A Care Need only maps to a **Service Category**.
2. **Emergency first.** Any Emergency signal skips everything and shows the nearest emergency units plus: *"Go now. SHA's Emergency fund covers the first 24 hours of emergency care for every Kenyan, registered or not."*
3. **AI reads, code decides.** Gemma extracts and classifies. Plain code compares amounts to `tariffs.json` and produces every Flag. Gemma never decides a Flag.
4. **Flags state facts and a question, never an accusation.** Never say "illegal", "fraud" or "overcharge". Say: *"SHA pays this Level 4 facility KES 3,360 per day. You are charged KES 5,000 per day. Ask why."*
5. **Bill photos are never stored.** Process in memory, then discard. Only anonymised results are saved (facility, Service Category, amount, Flag type, date).
6. **Demo data only on Demo Facilities.** Invented Coverage Reports are attached only to clearly fictional facilities (e.g. *"Demo Hospital Kilimani"*) shown with a **"Demo data"** label. Real facilities only ever show real reports.
7. **Never invent facts.** Tariff numbers, SHA contact details and facility data come from files that a human has checked against a source. Neither Claude Code nor Gemma may make them up.
8. **Not legal or medical advice** disclaimer in the footer and on every Bill Check result.

---

## 6. Feature specs

### 6.1 Find

**Flow:** Home → "What care do you need?" (free text, or tap one of the 8 Service Category chips) → location permission → results list (and optional map) → facility card → **"Go here"**.

1. **Emergency check, layer 1 (code, before any API call):** match the text against `data/emergency_keywords.json` (English + Swahili). Hit → Emergency screen.
2. **Classify (Gemma):** map the Care Need to exactly one Service Category, or `emergency`. If Gemma fails or times out, show the 8 chips and let the User pick.
3. **Location:** `navigator.geolocation`. If it is denied, let the User pick a Nairobi area from a list (each area has fixed coordinates). Coordinates are never stored.
4. **Results:** only facilities from `facilities.csv` that list that Service Category, **sorted by distance only**, within 15 km. No blended score.
5. **Facility card shows:**
   - name, Facility Level, distance
   - **what SHA covers** for this Service Category at this level (from `tariffs.json`)
   - **Coverage Report badge**, last 90 days, Verified and Unverified counted separately: *"4 verified · 2 unverified reports of paying for maternity"*
   - Google rating and review count (if enabled) with Google attribution
   - "Demo data" label if the facility is a Demo Facility
   - **"Go here"** button: opens Google Maps directions and saves a **Visit** on the device.

Service Categories (fixed list, ids in code):
`maternity`, `dialysis`, `imaging`, `eye_care`, `general_outpatient`, `surgery`, `cancer_care`, `emergency`

### 6.2 Bill Check

**Flow:** "Check a bill" → pick the facility (search the seeded list; pre-filled from the last Visit; or **"Not listed"** → pick the Facility Level manually) → 2 quick questions → take one photo → results.

**The 2 questions (one tap each):**
1. *"Is the Patient registered with SHA?"* Yes / No
2. *"Were you referred here, or was this an emergency?"* Referred / Emergency / Neither

**Pipeline:**

```
photo ─► [Gemma] extract + classify ─► [code] check the read ─► [code] rules ─► [Gemma] Desk Script + Complaint Draft
              JSON                         totals add up?          Flags              (EN or SW)
                                           confidence ok?
                                           else → "retake"
```

1. **Extract + classify (one Gemma call).** Input: image. Output JSON: Line Items (description, quantity, unit price, amount, **line item category**, confidence 0–1), subtotal, SHA deduction, balance (amount the Patient is asked to pay).
2. **Check the read (code).** Sum of Line Items must equal the subtotal within 1%. If it does not, or average confidence < 0.6, return `status: "retake"` with a reason. **Never guess.**
3. **Rules (code).** For each Line Item, produce exactly one **Flag** (see 6.3).
4. **Amount in question** = the sum of the Flagged amounts, **capped at the balance** (we judge what the Patient is asked to pay, not what SHA already paid).
5. **Desk Script + Complaint Draft (one Gemma call).** Input: the Flags (not the image). Output: a short Desk Script (≤ 3 sentences) and a Complaint Draft addressed to SHA's official complaint channels from `data/sha_contacts.json`. **Copy** and **Share** buttons (Web Share API). Nothing is sent automatically.
6. **Verified Report.** If a listed facility was picked, save one Coverage Report per Service Category found on the Bill. If "Not listed", save nothing.

**Line item categories (fixed list):**
`bed_day`, `normal_delivery`, `caesarean`, `mri`, `ct`, `haemodialysis_session`, `icu_day`, `ambulance`, `emergency_care`, `consultation`, `medicine`, `lab_test`, `excluded`, `other`

### 6.3 Rules engine and Flags

| Flag | Shown as | When |
|---|---|---|
| **Should Be Free** | 🔴 | A `free` rule matches and the Patient is charged > 0 |
| **Above Tariff** | 🟡 | A `max_per_unit` rule matches and unit price > Tariff. Amount in question = (unit price − Tariff) × quantity |
| **Payable** | 🟢 | Category `excluded` (e.g. private ward upgrade, supplements, cosmetic), or no rule applies |
| **Unclear** | ⚪ | Line Item confidence < 0.6, or category `other` |

**Modifiers:**
- **Patient not registered:** only rules with `covers_unregistered: true` apply (e.g. `emergency_care`, `ambulance`: "accessible to all Kenyans regardless of registration"), and only if the answer to question 2 was Emergency. All other items are Payable, and the result shows how to register with SHA.
- **Referral = Neither, at Level 4–6:** rules marked `requires_referral` produce a softened message: *"This may be covered if you had a referral from a primary facility."*

**Starter rules** (non-dev data person verifies each one against a source and fills `source_url` before the demo; figures below are from secondary summaries and **may be wrong**):

| Rule | Type | Tariff |
|---|---|---|
| Normal delivery, Levels 2–6 | free | SHA pays KES 10,000 |
| Caesarean, Levels 2–6 | free | SHA pays KES 30,000 |
| Inpatient bed-day | max_per_unit | L3 2,240 · L4 3,360 · L5 3,920 · L6 4,480 per day |
| Emergency care, first 24h, all Kenyans | free | Fee-for-service |
| ICU / HDU | max_per_unit | 28,000 per day, up to 12 days |
| Haemodialysis | max_per_unit | 10,650 per session, max 2 a week |
| MRI / CT | max_per_unit | 11,000 / 6,900 |
| Ambulance ≤ 25 km | max_per_unit | 4,500 flat |

### 6.4 Report (Visit follow-up)

1. Tapping **"Go here"** saves a **Visit** in `localStorage`: `{facility_id, service_category, created_at}`.
2. When the app opens **≥ 2 hours** after a Visit that has no answer yet, it shows: *"Did you pay anything for maternity at <facility>?"*
   - **No** → Unverified Report, `paid: false`
   - **Yes** → amount field → Unverified Report, `paid: true, amount`
   - **Check my bill** → Bill Check with the facility pre-filled → Verified Report
   - **Skip** → never ask about this Visit again
3. **Rate limit:** one Coverage Report per device per facility per Service Category per 30 days (server-enforced).
4. Facility cards count reports from the **last 90 days**, Verified and Unverified shown separately. Wording describes patterns only.

---

## 7. Architecture

```
Phone browser (React PWA)
   │  HTTPS, same origin
   ▼
FastAPI  (serves /api/* and the built frontend from /)
   ├── Gemini API → Gemma 4 (gemma-4-31b-it)
   ├── Google Places API (optional: rating, userRatingCount only)
   └── SQLite (re-seeded from data/*.csv and *.json on every start)
```

- **Backend:** Python 3.12, FastAPI, Pydantic, `google-genai` SDK, SQLite (stdlib `sqlite3`).
- **Frontend:** React + Vite + TypeScript, Tailwind, Leaflet + OpenStreetMap for the map (free, no key). PWA manifest so it can be added to the home screen.
- **Camera:** `<input type="file" accept="image/*" capture="environment">`. **Location:** `navigator.geolocation`. Both **require HTTPS**, so deploy in the first hour.
- **Deploy:** one Render web service. The build step builds the frontend; FastAPI serves `frontend/dist`. SQLite resets on redeploy, which is acceptable.
- **Secrets:** `GEMINI_API_KEY`, `GOOGLE_PLACES_API_KEY` (optional) in `.env` locally and Render env vars. Never commit them.

### Gemma usage

| Call | Input | Output |
|---|---|---|
| `classify_care_need` | Care Need text + language | `{service_category, is_emergency}` |
| `extract_bill` | Bill image | Line Items with category + confidence, subtotal, SHA deduction, balance |
| `write_dispute` | Flags + facility + language | `{desk_script, complaint_draft}` |

- Ask for **JSON only**, validate with Pydantic, **retry once** on invalid JSON, then fail gracefully (classify → show chips; extract → "retake"; dispute → show Flags without the text).
- Timeouts: 20 s per call.
- Prompts live in `backend/prompts/*.md` so they are easy to review and change.

## 8. Data

All files in `data/` are committed and MIT-licensed as an open dataset.

**`facilities.csv`**: all 762 Nairobi Contracted Facilities, imported from [SHA's list](https://www.sha.go.ke/contracted-facilities-nairobi/) by `python scripts/import_sha_facilities.py` (from `backend/`), plus the Demo Facilities. Re-running the import keeps Demo Facilities and anything filled in by hand (`lat`, `lng`, `service_categories`, `google_place_id`), and drops facilities SHA no longer lists. SHA sub-levels map to the whole Level for Tariffs (`Level 3A`/`3B` → 3, `4B` → 4, `6A`/`6B` → 6); `sha_level` keeps SHA's label.
```
id,name,level,lat,lng,service_categories,google_place_id,is_demo,source_url,checked_on,sha_registration_no,sha_level,type,sub_county
sha-gk-011577,MAMA LUCY KIBAKI HOSPITAL,5,,,,,false,https://www.sha.go.ke/contracted-facilities-nairobi/,2026-10-24,GK-011577,Level 5,HOSPITAL LEVEL 5,Embakasi
d001,Demo Hospital Kilimani,4,-1.2900,36.7833,maternity;imaging;general_outpatient,,true,,2026-10-24,,,,
```
SHA's list has no coordinates or services. **A facility appears in Find only once a person fills `lat`, `lng` and `service_categories`** (non-devs: 30–50 facilities, with the source checked); every facility is searchable straight away.

**`tariffs.json`**
```json
[
  {
    "id": "normal_delivery",
    "line_item_category": "normal_delivery",
    "service_category": "maternity",
    "type": "free",
    "levels": [2, 3, 4, 5, 6],
    "tariff_kes": 10000,
    "unit": "per_delivery",
    "requires_referral": false,
    "source_url": "",
    "note_en": "SHA covers normal delivery; registered members should not pay out of pocket.",
    "note_sw": "SHA inalipia kujifungua kwa kawaida; wanachama waliosajiliwa hawapaswi kulipa."
  },
  {
    "id": "bed_day_l4",
    "line_item_category": "bed_day",
    "service_category": "general_outpatient",
    "type": "max_per_unit",
    "levels": [4],
    "tariff_kes": 3360,
    "unit": "per_day",
    "requires_referral": true,
    "source_url": "",
    "note_en": "SHA pays Level 4 facilities KES 3,360 per inpatient day.",
    "note_sw": "SHA hulipa vituo vya Kiwango cha 4 KES 3,360 kwa siku ya kulazwa."
  }
]
```

**`emergency_keywords.json`**: `{ "en": ["chest pain", "can't breathe", ...], "sw": ["maumivu ya kifua", "hawezi kupumua", ...] }`, written by a non-dev and reviewed by a second person.

**`sha_contacts.json`**: SHA's official complaint channels, **copied by a person from sha.go.ke** with `source_url`: `[{ "channel": "Email", "value": "...", "source_url": "https://sha.go.ke/..." }]`.

**`demo_reports.csv`**: invented Coverage Reports, **Demo Facilities only** (the seed script must reject any row whose facility is not `is_demo`). Columns: `facility_id,service_category,paid,amount_kes,verified,flag,created_at`; an empty `created_at` means "at startup", so the report stays inside the 90-day window.

**`areas.json`**: Nairobi areas with coordinates for when location is denied: `[{ "id": "kilimani", "name": "Kilimani", "lat": -1.29, "lng": 36.78 }]`.

**Checking the data:** from `backend/`, run `python -m app.data`. It prints counts and warnings (missing `source_url`, empty files). The app refuses to start if a file breaks a hard rule: invented reports on a real facility, a Demo Facility whose name doesn't contain "Demo", an unknown Service Category or Level, duplicate ids. `tariffs.json` `unit` is one of `per_delivery`, `per_day`, `per_session`, `per_scan`, `per_trip`, `per_visit`, `per_procedure`, `flat`; optional `covers_unregistered` (default `false`) marks rules that apply to every Kenyan in an Emergency.

### SQLite tables

```sql
facilities(id TEXT PK, name, level INT, lat REAL, lng REAL, service_categories TEXT,
           google_place_id TEXT, is_demo INT)
coverage_reports(id INTEGER PK, facility_id TEXT, service_category TEXT,
                 paid INT, amount_kes INT NULL, verified INT,
                 flag TEXT NULL, device_id TEXT, created_at TEXT)
```
Tariffs, keywords, contacts and areas stay in memory from JSON. No table for Bills (they are never stored).

---

## 9. API contract

Base path `/api`. All responses are JSON. Errors: `{"error": {"code": "string", "message": "string"}}` with a matching HTTP status. **Changing this contract means updating this section first and telling the other dev.**

### `GET /api/health`
```json
{ "ok": true }
```

### `POST /api/care-need/classify`
Request:
```json
{ "text": "Mke wangu anakaribia kujifungua", "lang": "sw" }
```
Response:
```json
{ "service_category": "maternity", "is_emergency": false, "matched_by": "model" }
```
`matched_by`: `"keywords"` (layer 1 hit, no Gemma call), `"model"`, or `"fallback"` (Gemma failed; `service_category` is `null` and the frontend shows the chips).

### `GET /api/facilities?service_category=maternity&lat=-1.29&lng=36.82&lang=en`
Response:
```json
{
  "facilities": [
    {
      "id": "d001",
      "name": "Demo Hospital Kilimani",
      "level": 4,
      "is_demo": true,
      "lat": -1.29, "lng": 36.78,
      "distance_km": 3.4,
      "benefit_summary": "SHA covers normal delivery (KES 10,000) and caesarean (KES 30,000). You should not pay out of pocket.",
      "coverage": {
        "window_days": 90,
        "verified_paid": 4, "verified_free": 1,
        "unverified_paid": 2, "unverified_free": 3
      },
      "google": { "rating": 4.1, "user_rating_count": 212 }
    }
  ]
}
```
`google` is `null` when ratings are disabled or unavailable. Max 15 km, sorted by `distance_km`.

### `GET /api/facilities/search?q=mama lucy&service_category=maternity`
Searches every facility on SHA's contracted list for Nairobi (plus Demo Facilities). Used by the Bill Check facility picker and by "Is this facility contracted?" lookups. `service_category` is optional; it narrows `coverage` to that Service Category (otherwise all of them).
```json
{ "facilities": [ {
    "id": "sha-gk-011577", "name": "MAMA LUCY KIBAKI HOSPITAL", "level": 5, "is_demo": false,
    "contracted": true, "contracted_checked_on": "2026-10-24",
    "sha_level": "Level 5", "type": "HOSPITAL LEVEL 5", "sub_county": "Embakasi",
    "coverage": { "window_days": 90, "verified_paid": 0, "verified_free": 0, "unverified_paid": 0, "unverified_free": 0 }
} ] }
```
- Every word typed must start a word of the name, any order, case and dots ignored (`m.p. shah` finds `MP SHAH HOSPITAL`). Best matches first, max 20.
- `contracted` is `true` for facilities from SHA's list and `false` for Demo Facilities (show the "Demo data" label instead). `name` is exactly as SHA prints it (upper case).
- **Empty result ≠ "not contracted".** Abbreviations and spelling differ (`knh` finds nothing; `kenyatta` does). Show exactly: EN *"We couldn't find this name on SHA's list of contracted facilities in Nairobi (checked {date}). Try the full name, or ask the facility or SHA before you go."* / SW *"Hatukupata jina hili kwenye orodha ya SHA ya vituo vilivyo na mkataba Nairobi (iliangaliwa {date}). Jaribu jina kamili, au uliza kituo au SHA kabla ya kwenda."*

### `GET /api/areas`
Nairobi areas from `data/areas.json`, for when location is denied. Send the chosen area's `lat`/`lng` to `/api/facilities`.
```json
{ "areas": [ { "id": "kilimani", "name": "Kilimani", "lat": -1.29, "lng": 36.78 } ] }
```

### `POST /api/bill-check` (multipart/form-data)
Fields: `image` (file, ≤ 8 MB), `facility_id` (string, optional), `facility_level` (int 2–6, required if no `facility_id`), `registered` (`true`/`false`), `referral` (`referred` | `emergency` | `neither`), `lang` (`en` | `sw`), `device_id`.

Response (ok):
```json
{
  "status": "ok",
  "facility": { "id": "d001", "name": "Demo Hospital Kilimani", "level": 4 },
  "bill": {
    "line_items": [
      { "description": "Normal delivery package", "quantity": 1, "unit_price_kes": 15000, "amount_kes": 15000, "category": "normal_delivery", "confidence": 0.93 },
      { "description": "Ward (2 days)", "quantity": 2, "unit_price_kes": 5000, "amount_kes": 10000, "category": "bed_day", "confidence": 0.88 },
      { "description": "Multivitamin", "quantity": 1, "unit_price_kes": 800, "amount_kes": 800, "category": "excluded", "confidence": 0.81 }
    ],
    "subtotal_kes": 25800,
    "sha_deduction_kes": 0,
    "balance_kes": 25800
  },
  "flags": [
    { "line_item_index": 0, "flag": "should_be_free", "tariff_kes": 10000, "charged_kes": 15000, "amount_in_question_kes": 15000,
      "message": "SHA covers normal delivery at Level 4. Registered members should not pay out of pocket. Ask why you are being charged.",
      "rule_id": "normal_delivery", "source_url": "https://..." },
    { "line_item_index": 1, "flag": "above_tariff", "tariff_kes": 3360, "charged_kes": 5000, "amount_in_question_kes": 3280,
      "message": "SHA pays this Level 4 facility KES 3,360 per day. You are charged KES 5,000 per day. Ask why.",
      "rule_id": "bed_day_l4", "source_url": "https://..." },
    { "line_item_index": 2, "flag": "payable", "tariff_kes": null, "charged_kes": 800, "amount_in_question_kes": 0,
      "message": "Supplements are not covered by SHA.", "rule_id": null, "source_url": null }
  ],
  "summary": { "amount_in_question_kes": 18280, "balance_kes": 25800 },
  "desk_script": "Hello, I am registered with SHA. SHA covers normal delivery here, and pays KES 3,360 per ward day. Could you explain these charges?",
  "complaint_draft": "To: SHA ...",
  "sha_contacts": [ { "channel": "...", "value": "...", "source_url": "https://sha.go.ke/..." } ],
  "verified_report_saved": true,
  "disclaimer": "This is not legal or medical advice. Tariffs may have changed; confirm with SHA."
}
```
`flag` values: `should_be_free`, `above_tariff`, `payable`, `unclear`.

- `facility`: when "Not listed" was picked, `id` and `name` are `null` and `level` is the `facility_level` sent.
- `desk_script` and `complaint_draft` are `null` when there is nothing to ask about (no 🔴/🟡 Flags), when Gemma fails, or when the text fails the code check (accusing words, or numbers that were not in the Flags). Show the Flags without them.
- `verified_report_saved` is `false` for "Not listed", for an unregistered Patient, and when this device already reported this facility and Service Category in the last 30 days.
- Errors: `404 not_found` (unknown `facility_id`), `413 too_large` (image over 8 MB), `422 invalid_request` (missing field, no `facility_id` or `facility_level`, file is not an image).
- Testing only: `?mock=ok` or `?mock=retake` returns the examples on this page without calling Gemma.

Response (retake):
```json
{ "status": "retake", "reason": "totals_mismatch", "message": "We could not read this bill clearly. Please retake the photo flat, in good light, with the whole bill visible." }
```
`reason`: `totals_mismatch`, `low_confidence`, `not_a_bill`, `model_error`.

### `POST /api/reports`
Request:
```json
{ "facility_id": "f012", "service_category": "maternity", "paid": true, "amount_kes": 5000, "device_id": "uuid" }
```
Response `201`: `{ "id": 41, "verified": false }`
Response `429`: `{"error": {"code": "rate_limited", "message": "You already reported this facility for this service in the last 30 days."}}`
Response `404`: `not_found` for an unknown `facility_id`. `amount_kes` is ignored when `paid` is `false`.

---

## 10. Frontend screens

1. **Home**: two big buttons, *Find care* and *Check a bill*, plus the EN/SW toggle and the Visit follow-up prompt when one is due.
2. **Find: Care Need**: text box + 8 Service Category chips.
3. **Emergency**: red screen with the 24-hour message and the nearest facilities offering `emergency`. No other content.
4. **Find: Results**: list of facility cards (map toggle optional).
5. **Bill Check: Facility**: search box, last Visit pre-filled, "Not listed" → level picker.
6. **Bill Check: Questions**: registered? referral?
7. **Bill Check: Photo**: camera button, tips ("flat, good light, whole bill").
8. **Bill Check: Result**: amount in question at the top, Flag cards (🔴 🟡 🟢 ⚪), Desk Script, Complaint Draft with Copy/Share, disclaimer.
9. **Report prompt**: modal from Home (section 6.4).

Every screen: large tap targets, readable in sunlight, no screen needs scrolling to reach its main action.

## 11. Repo layout

```
haki-afya/
├── CLAUDE.md            ← instructions for Claude Code (both devs)
├── document.md          ← this brief
├── GLOSSARY.md          ← agreed terms
├── LICENSE              ← MIT
├── README.md            ← setup, demo link, screenshots (pitch person)
├── backend/
│   ├── app/             ← FastAPI app, routes, rules engine, Gemma client
│   ├── prompts/         ← classify_care_need.md, extract_bill.md, write_dispute.md
│   └── tests/           ← rules engine tests with fixed Line Items (no API calls)
├── frontend/            ← Vite + React + TS
├── data/                ← open dataset (section 8)
└── demo/                ← the 3 SAMPLE bill images
```

## 12. Agentic development with Claude Code

Both devs build with Claude Code. That changes the job; it does not remove it.

- **What it gives us:** the language barrier mostly disappears, and boilerplate (routes, components, seed scripts) is fast. We picked Python and TypeScript because they are what the devs **read** fastest, since they still need to review, debug and explain the code to judges.
- **What keeps two agents aligned:** this document, `GLOSSARY.md`, and the API contract in section 9. `CLAUDE.md` tells each agent to read them first.
- **Workflow:** backend builds against the contract and returns the exact example JSON as mocks in the first 30 minutes, so the frontend is never blocked. Frontend builds against those mocks.
- **The human's job:** review every diff that touches the rules engine, Flag wording or data files. Those are the parts where a confident mistake hurts real people.
- **Tests:** the rules engine gets unit tests from the 3 demo bills' Line Items (no Gemma calls in tests).

## 13. Team and timeline

Times are EAT. Adjust the start to when you actually begin; keep the end fixed.

| When | Backend dev | Frontend dev | Data (non-dev) | Demo assets (non-dev) | Pitch (non-dev) |
|---|---|---|---|---|---|
| **First 30 min** | Repo, FastAPI skeleton, mock endpoints returning section 9 JSON | Vite app, routing, EN/SW toggle | Start `facilities.csv` | Draft the 3 SAMPLE bills | Get Gemini API key (Google AI Studio), Places key with billing |
| **First hour** | **Deploy to Render (HTTPS)** | Home + Find screens on mocks | Verify tariff figures, fill `source_url` | Print or photograph the 3 bills | Copy `sha_contacts.json` from sha.go.ke |
| **Next 2 hours** | `extract_bill` + check the read + rules engine + tests | Bill Check screens on mocks | 30–50 facilities done, `emergency_keywords.json` | `demo_reports.csv` (Demo Facilities only) | Slides: problem, demo, open-source, roadmap |
| **Next 1.5 hours** | `classify_care_need`, `/facilities`, `/reports`, `write_dispute` | Switch to real API, Report prompt, result cards | Test Find on real phones | Test Bill Check with all 3 bills | README draft |
| **6:00 PM** | **Google ratings go or drop** | Polish, PWA manifest | | | |
| **7:00 PM** | **Feature freeze.** Bug fixes only | Bug fixes only | | | Rehearse demo twice |
| **8:00 PM** | Final deploy | QR code for the demo URL | | | **Submit the project on MLH** and enter both prize categories |
| **9:00 PM** | Hack Day ends | | | | |

## 14. Demo script (~2 minutes)

1. **Problem (20 s):** the MP Shah suspension, the KNH viral video. *"The hospital knows what SHA covers. The person paying doesn't."*
2. **Find (30 s):** *"Wanjiku's due date is close."* Type it in Swahili → maternity → nearby facilities. Demo Hospital Kilimani shows *"4 verified reports of paying for delivery"*. She picks another facility and taps **Go here**.
3. **Bill Check (45 s):** discharge, KES 25,800 bill. Photo of SAMPLE bill 1 → 🔴 delivery should be free, 🟡 ward above Tariff, 🟢 supplements payable. **KES 18,280 in question.** Show the Desk Script and Share the Complaint Draft.
4. **The fair bill (10 s):** SAMPLE bill 3 → all 🟢 *"Looks fair."* The app isn't against hospitals; it's for accuracy.
5. **Report loop (10 s):** the follow-up prompt; her check updated the map for the next mother.
6. **Open source + roadmap (15 s):** open-weight Gemma 4, MIT repo, open tariff dataset, local Gemma so Bills never leave the phone, WhatsApp bot, all 47 counties.

**Judges can try it:** QR code on the last slide.

## 15. Submission checklist

- [ ] Public GitHub repo with MIT `LICENSE`
- [ ] README: what it is, live URL, setup, screenshots, data sources, disclaimer
- [ ] Live HTTPS URL works on a phone (camera + location)
- [ ] All `tariffs.json` rows have a `source_url`; `sha_contacts.json` copied from sha.go.ke
- [ ] No invented reports on real facilities (seed script check passes)
- [ ] No API keys in the repo
- [ ] MLH project submitted before 9:00 PM, entered in **Best Use of Gemma 4** and **Best Open-Source AI Project**
- [ ] Optional: a DEV post about the build (also eligible for the Hacktoberfest Week 4 DEV challenge, Oct 26–31, if the project is rebuilt or extended as a new project in that window; check its rules first)

## 16. Risks

| Risk | Mitigation |
|---|---|
| Tariff figures wrong or outdated | `source_url` on every rule, cautious Flag wording, disclaimer, "confirm with SHA" |
| Gemma misreads a Bill | Check of the read, confidence threshold, retake, Unclear Flag |
| Gemma slow or down during the demo | 20 s timeout; record a backup screen video of the full demo in the 7:00 PM slot |
| Phone camera/location blocked | HTTPS deploy in the first hour; area picker fallback |
| Fake or competitor reports | Rate limit, Verified vs Unverified, patterns not accusations |
| Defamation of a real hospital | Demo data only on Demo Facilities, never accusations |
| Treated as medical advice | Service Categories only, Emergency screen, disclaimer |

## 17. Roadmap (slide only, do not build today)

Local Gemma (Ollama) so Bills never leave the device · WhatsApp and USSD access · multi-page Bills · all 47 counties with automatic SHA list updates · anonymised facility heatmap for journalists and SHA · SMS follow-up reminders.

## 18. Sources

- [MP Shah Hospital suspended from SHA (Nation)](https://nation.africa/kenya/news/mp-shah-hospital-suspended-from-sha-5507886)
- [KNH responds after viral SHA video (Nairobi Wire)](https://nairobiwire.com/2026/10/knh-investigates-patient-complaints-missing-test-results.html)
- [SHA digital transition: claim rejections (Streamline Feed)](https://streamlinefeed.co.ke/news/social-health-authority-sha-digital-transition-hospital-claims-2026)
- [Hospitals reject SHA payout (Nation)](https://nation.africa/kenya/health/we-will-not-sign-hospitals-reject-sha-payout-5523134)
- [Social Health Authority Scandal (Wikipedia)](https://en.wikipedia.org/wiki/Social_Health_Authority_Scandal)
- [SHA contracted facilities (sha.go.ke)](https://sha.go.ke/contracted-facilities/)
- [SHA Tariffs 2026 RIA (Ministry of Health)](https://health.go.ke/sites/default/files/2026-04/RIA%20-SHA%20Tariffs%202026%205TH%20FEB%202026%20(1).pdf)
- [SHA benefits package and tariffs (MyCyber, secondary)](https://mycyber.co.ke/sha-benefits-package/)
- [What SHA actually covers in 2026 (PayBill, secondary)](https://paybillke.com/guides/what-sha-actually-covers-kenya-2026)
- [The highs, lows and hard truths of Kenya's new health cover (Nation)](https://nation.africa/kenya/health/the-highs-lows-and-hard-truths-of-kenya-s-new-health-cover-5454816)
- [Run Gemma with the Gemini API (Google)](https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api?hl=en)
- [Google Maps Platform pricing](https://developers.google.com/maps/billing-and-pricing/pricing)
- [A line-item schema for invoice extraction and the checks that catch bad reads (DEV, Damin Mutti)](https://dev.to/damin_mutti_e213ac1a11bf4/a-line-item-schema-for-invoice-extraction-and-the-checks-that-catch-bad-reads-1jn9)
