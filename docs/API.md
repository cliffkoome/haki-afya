# Backend API: integration guide for the frontend

Every route in `backend/` is now real: no route returns a mock unless `?mock=` is sent.
This file covers how to wire `frontend/` to the live backend: what is out of sync today,
the exact response shapes, and how each field should behave in the UI.

- **Source of truth:** `document.md` section 9. If this file and section 9 disagree, section 9 wins. Don't change a request or response shape without updating section 9 first and telling the user.
- **Terms:** use `GLOSSARY.md` terms in code and UI text (`Flag`, `Service Category`, `Coverage Report`, never "alert", "review", "symptom").
- **Backend code:** routes in `backend/app/routes.py`, error envelope in `backend/app/main.py`, types in `backend/app/models.py`.

---

## 1. What to change in `frontend/` now

The frontend API layer (`src/api/types.ts`, `src/api/client.ts`) was written against the
early mocks. These are the gaps with the live backend, most important first.

### 1.1 `BillCheckOk.desk_script` and `complaint_draft` can be `null`

`types.ts` types both as `string`. The backend returns `null` when there are no 🔴/🟡 Flags,
when Gemma fails, or when the generated text fails the backend's wording check.
`CheckResult.tsx` already guards with `result.desk_script && ...`, so only the type is wrong.

```ts
desk_script: string | null
complaint_draft: string | null
```

### 1.2 `BillCheckOk.facility` is never `null`

`types.ts` has `facility: {...} | null`. For "Not listed", the backend returns an object with
`id: null` and `name: null` and `level` set to the `facility_level` sent.

```ts
facility: { id: string | null; name: string | null; level: number }
```

`CheckResult.tsx:37` compares `state.facility?.id === facility?.id`. For "Not listed" both are
`null`/`undefined`. Check that this can't mark "Not listed" as demo (it can't today, since
`state.facility?.is_demo` is `undefined`), but compare on a non-null id to be safe.

### 1.3 `FacilitySearchResult` has more fields, and search takes `service_category`

```ts
export interface FacilitySearchResult {
  id: string
  name: string                       // as SHA prints it, usually UPPER CASE
  level: number                      // 2–6
  is_demo: boolean
  contracted: boolean                // true = on SHA's list; false = Demo Facility
  contracted_checked_on: string | null  // "YYYY-MM-DD" the SHA list was imported
  sha_level: string | null           // SHA's label, e.g. "Level 3B"; null for Demo Facilities
  type: string | null                // e.g. "HOSPITAL LEVEL 5"; null for Demo Facilities
  sub_county: string | null          // e.g. "Embakasi"; null for Demo Facilities
  coverage: CoverageCounts
}
```

```ts
searchFacilities: (q: string, service_category?: ServiceCategory) => {
  const qs = new URLSearchParams({ q })
  if (service_category) qs.set('service_category', service_category)
  return request<{ facilities: FacilitySearchResult[] }>(`/api/facilities/search?${qs}`)
},
```

`sub_county` is useful in the picker to tell apart facilities with similar names.

### 1.4 Empty search results need the agreed wording

`CheckFacility.tsx:139` shows `facility.noResults` ("No facility found with that name.").
An empty result does **not** mean the facility isn't contracted: abbreviations and spellings
differ (`knh` finds nothing, `kenyatta` does). Section 9 requires this exact text, with
`{date}` = the SHA list's import date:

- `en`: *"We couldn't find this name on SHA's list of contracted facilities in Nairobi (checked {date}). Try the full name, or ask the facility or SHA before you go."*
- `sw`: *"Hatukupata jina hili kwenye orodha ya SHA ya vituo vilivyo na mkataba Nairobi (iliangaliwa {date}). Jaribu jina kamili, au uliza kituo au SHA kabla ya kwenda."*

An empty response has no date in it. Every SHA facility currently has
`contracted_checked_on: "2026-10-24"`, so either use that as a constant or keep the date from
any earlier non-empty response. Don't make up a different date.

### 1.5 Timeouts are shorter than the backend's worst case

Each Gemma call has a 20 s timeout, and a call is retried once if it returns invalid JSON.

| Endpoint | Backend worst case | Client timeout now | Suggested |
|---|---|---|---|
| `POST /api/care-need/classify` | ~40 s | 15 s (default) | 25 s |
| `POST /api/bill-check` | ~80 s (read + dispute) | 60 s | 90 s |

`Find.tsx` already falls back to the Service Category chips on any error, so a client
timeout on classify is safe. A Bill Check timeout loses the result, so raise that one.

### 1.6 Optional

- `LineItem.category` can be narrowed from `string` to the union in section 3.
- `GET /api/areas` exists, but `src/lib/areas.ts` bundles `data/areas.json` at build time. That works offline and returns the same data, so keep it. The backend adds an `id` field the bundle doesn't need.
- The Find screen checks emergency keywords in `src/lib/emergency.ts` before calling the API. The backend checks the same keyword file again, so keep both.

---

## 2. Rules the UI must follow

These come from `CLAUDE.md` and `document.md` section 5. They affect how API data is shown.

- **Show backend text as is.** `Flag.message`, `benefit_summary`, retake `message`, `disclaimer`, `desk_script` and `complaint_draft` arrive in the requested `lang` and are already checked for non-accusing wording. Don't rewrite or summarise them.
- **Your own text never accuses.** No "illegal", "fraud" or "overcharge". State the Tariff, the amount charged, and a question to ask.
- **Every string you add exists in `en` and `sw`** (`src/i18n/en.ts`, `src/i18n/sw.ts`).
- **`is_demo: true` always gets the "Demo data" label** (`DemoPill`), wherever a facility appears.
- **Never store the Bill photo.** Send it once in the request. Don't keep it in `localStorage`, IndexedDB or the Cache API, and don't let the service worker cache `POST /api/bill-check`.
- **Don't store the Patient's location.** Send `lat`/`lng` and discard them.
- **No medical advice.** A Care Need maps only to a Service Category.
- **Don't fill gaps.** If a field is `null` (rating, `source_url`, `sha_level`), show nothing for it. Don't make up a value.

---

## 3. Conventions

- Base path `/api`, same origin as the frontend (FastAPI serves `frontend/dist`). In dev, `vite.config.ts` proxies `/api` to `http://localhost:8000`.
- JSON in and out, except `POST /api/bill-check` (`multipart/form-data`).
- Money: whole KES as integers in fields ending `_kes`. Format with `src/lib/format.ts`.
- Facility Level: integer 2–6. SHA sub-levels map to the whole Level (`3A`/`3B` → 3, `4B` → 4, `6A`/`6B` → 6). `sha_level` keeps SHA's label.
- `device_id`: from `getDeviceId()` in `src/lib/device.ts`. The only identity, used only for rate limits.

```ts
type ServiceCategory = 'maternity' | 'dialysis' | 'imaging' | 'eye_care'
  | 'general_outpatient' | 'surgery' | 'cancer_care' | 'emergency'
type Referral = 'referred' | 'emergency' | 'neither'
type FlagType = 'should_be_free' | 'above_tariff' | 'payable' | 'unclear'
type LineItemCategory = 'bed_day' | 'normal_delivery' | 'caesarean' | 'mri' | 'ct'
  | 'haemodialysis_session' | 'icu_day' | 'ambulance' | 'emergency_care' | 'consultation'
  | 'medicine' | 'lab_test' | 'excluded' | 'other'
type RetakeReason = 'totals_mismatch' | 'low_confidence' | 'not_a_bill' | 'model_error'

interface CoverageCounts {     // Coverage Reports in the last 90 days
  window_days: 90
  verified_paid: number
  verified_free: number
  unverified_paid: number
  unverified_free: number
}
```

### Errors

Every non-2xx response from an `/api` route has this shape. `ApiError` in `client.ts` already parses it.

```json
{ "error": { "code": "not_found", "message": "Facility not found" } }
```

| Status | `code` | When |
|---|---|---|
| 404 | `not_found` | Unknown `facility_id`, unknown route |
| 413 | `too_large` | Bill image over 8 MB |
| 422 | `invalid_request` | Missing or invalid field |
| 429 | `rate_limited` | Same device + facility + Service Category reported in the last 30 days |
| other | `error` | e.g. 405 wrong method |

- Branch on `code`, never on `message`. `message` is English and meant for logs. For field validation errors it is a raw Python list. Show your own translated text.
- `client.ts` adds `timeout` and `network` (status 0) for failures before a response arrives.
- In production a `GET` to a mistyped `/api/...` path returns `index.html` (the SPA catch-all), not a JSON 404. `client.ts` then fails to parse the JSON and throws `ApiError('error', ...)`. If you see that on a GET, check the path.

---

## 4. Endpoints

### `GET /api/health`

`{ "ok": true }`

---

### `POST /api/care-need/classify`

Maps a Care Need in the Patient's own words to a Service Category.

Request (JSON):

| Field | Type | Rules |
|---|---|---|
| `text` | string | Required, 1–500 characters. Trim before sending. |
| `lang` | `'en' \| 'sw'` | Default `en` |

Response `200`:

```ts
{ service_category: ServiceCategory | null; is_emergency: boolean; matched_by: 'keywords' | 'model' | 'fallback' }
```

| `matched_by` | Meaning | UI |
|---|---|---|
| `keywords` | Emergency keyword found in code; Gemma not called. `service_category: 'emergency'`, `is_emergency: true`. | Emergency screen |
| `model` | Gemma classified it. If `is_emergency` is `true`, go to the Emergency screen. | Results for `service_category` |
| `fallback` | Gemma failed. `service_category: null`. | Show the chips |

Errors: `422` (empty or over 500 characters).

---

### `GET /api/facilities`

Facilities offering a Service Category within 15 km, nearest first.

Query: `service_category` (required), `lat` (−90 to 90), `lng` (−180 to 180), `lang` (default `en`).

Response `200`:

```ts
{ facilities: Array<{
  id: string
  name: string
  level: number
  is_demo: boolean
  lat: number
  lng: number
  distance_km: number          // rounded to 0.1
  benefit_summary: string      // in `lang`, from data/tariffs.json notes
  coverage: CoverageCounts     // for this Service Category
  google: { rating: number; user_rating_count: number } | null
}> }
```

- Sorted by `distance_km` only. Don't re-sort by rating or coverage.
- Only facilities whose coordinates and services have been filled in by hand are returned. Expect few results, mostly near central Nairobi, at first. An empty list means "none within 15 km in our data". It doesn't mean no facility offers the service, so word the empty state that way.
- If no Tariff rule matches, `benefit_summary` says SHA Tariff data is not available yet. Show it as is.
- `google` is `null` when ratings are off or unavailable. Show no rating in that case, not "0" and not "No rating".

Errors: `422`.

---

### `GET /api/facilities/search`

Name search over all ~762 SHA Contracted Facilities in Nairobi, plus the Demo Facilities.
Used by the Bill Check facility picker.

Query: `q` (required, 1–100 characters), `service_category` (optional; limits `coverage` to it, otherwise all Service Categories).

Response `200`: `{ facilities: FacilitySearchResult[] }` (type in 1.3).

Matching:
- Every typed word must be the start of a word in the name, in any order.
- Case, dots and apostrophes are ignored: `m.p. shah` finds `MP SHAH HOSPITAL`.
- Names that start with the query come first (a leading "THE" is ignored), then alphabetical order. Max 20 results.
- A query of only punctuation returns `[]`.

The search is in memory and fast. Keep the existing debounce and minimum query length.
For an empty result, see 1.4.

Errors: `422`.

---

### `GET /api/areas`

`{ areas: Array<{ id: string; name: string; lat: number; lng: number }> }`, from `data/areas.json`. The frontend currently bundles this file instead (see 1.6).

---

### `POST /api/bill-check`

Reads a Bill photo and returns a Flag for every Line Item. The backend keeps the image
in memory only and never stores it.

Request (`multipart/form-data`):

| Field | Type | Rules |
|---|---|---|
| `image` | file | Required. Content type must start with `image/`. Max 8 MB. `src/lib/image.ts` produces `image/jpeg`. |
| `registered` | `'true' \| 'false'` | Required |
| `referral` | `Referral` | Required |
| `device_id` | string | Required, 1–100 characters |
| `lang` | `'en' \| 'sw'` | Default `en` |
| `facility_id` | string | From search. Leave it out for "Not listed". |
| `facility_level` | `'2'`–`'6'` | Required when `facility_id` is missing. Ignored when `facility_id` is sent. |

`?mock=ok|retake` returns the fixed examples from section 9 without calling Gemma.
Validation still runs first, so a real image is required. `src/lib/devMock.ts` already wires this up.

Response `200` is one of two shapes. **Always branch on `status` first:** a retake is a 200, not an error.

#### `status: "ok"`

```ts
{
  status: 'ok'
  facility: { id: string | null; name: string | null; level: number }
  bill: {
    line_items: Array<{
      description: string
      quantity: number
      unit_price_kes: number
      amount_kes: number
      category: LineItemCategory
      confidence: number        // 0–1
    }>
    subtotal_kes: number
    sha_deduction_kes: number
    balance_kes: number
  }
  flags: Array<{
    line_item_index: number     // index into bill.line_items
    flag: FlagType
    tariff_kes: number | null
    charged_kes: number
    amount_in_question_kes: number
    message: string             // in `lang`
    rule_id: string | null
    source_url: string | null
  }>
  summary: { amount_in_question_kes: number; balance_kes: number }
  desk_script: string | null
  complaint_draft: string | null
  sha_contacts: Array<{ channel: string; value: string; source_url: string }>
  verified_report_saved: boolean
  disclaimer: string            // in `lang`
}
```

How to show each part:

- **`summary.amount_in_question_kes`**: the headline number. It is the sum of the Flagged amounts, capped at `balance_kes`. When it is `0`, the bill looks fair (`CheckResult.tsx` calls this `fair`).
- **`flags`**: one per Line Item. Join to the Line Item with `line_item_index`.

  | `flag` | Show | Meaning |
  |---|---|---|
  | `should_be_free` | 🔴 | A `free` rule matches and the Patient is charged |
  | `above_tariff` | 🟡 | Unit price above the Tariff. `amount_in_question_kes` = (unit price − Tariff) × quantity |
  | `payable` | 🟢 | Excluded item, no rule at this Level, within the Tariff, or no charge |
  | `unclear` | ⚪ | Confidence below 0.6, or category `other` |

  If `source_url` is set, link it as the source. If it is `null`, show no link.
  For an unregistered Patient, almost everything is `payable` and the `message` explains how to register.
  With `referral: neither` at Level 4–6, some messages are softer ("may be covered if you had a referral").
- **`bill`**: if the photo left out quantity, unit price, deduction or balance, the backend filled them in by arithmetic. Show the Line Items as returned.
- **`desk_script` / `complaint_draft`**: hide the whole block when `null`. Copy/Share as they are.
- **`sha_contacts`**: can be `[]`. Hide the contacts block in that case, and don't show placeholder contacts.
- **`verified_report_saved`**: `false` for "Not listed", for an unregistered Patient, or when rate-limited. Use it only to word a confirmation. Never show it as an error.
- **`disclaimer`**: always show it on the result screen.
- **Demo Facility:** if the picked facility has `is_demo`, show `DemoPill` on the result too.

#### `status: "retake"`

```ts
{ status: 'retake'; reason: RetakeReason; message: string }   // message in `lang`, ready to show
```

| `reason` | When | UI |
|---|---|---|
| `not_a_bill` | Not a bill, or no Line Items read | Show `message`, back to the camera |
| `totals_mismatch` | No subtotal, or Line Items don't add up (1% tolerance) | Same |
| `low_confidence` | Average confidence below 0.6 | Same |
| `model_error` | Gemma failed | Show `message` and a retry button that resends the same photo |

Errors: `404 not_found` (unknown `facility_id`), `413 too_large`, `422 invalid_request` (missing
field, neither `facility_id` nor `facility_level`, Level outside 2–6, not an image).

---

### `POST /api/reports`

Saves an unverified Coverage Report from the Visit follow-up.

Request (JSON):

| Field | Type | Rules |
|---|---|---|
| `facility_id` | string | Required, must exist |
| `service_category` | `ServiceCategory` | Required |
| `paid` | boolean | Required |
| `amount_kes` | integer ≥ 0, optional | Ignored when `paid` is `false` |
| `device_id` | string | Required, 1–100 characters |

Response `201`: `{ id: number; verified: false }`

Errors:
- `404` unknown facility.
- `422` invalid field.
- `429 rate_limited`: this device already reported this facility and Service Category in the last 30 days, including a Verified Report saved by Bill Check. `ReportPromptHost.tsx` already handles this. Treat it as done (close the prompt, mark the Visit as answered), not as a failure.

Only Visits to a listed facility can be reported. A "Not listed" Visit has no `facility_id`, so don't prompt for it.

---

## 5. Running it locally

```bash
# terminal 1, from backend/
uvicorn app.main:app --reload          # http://localhost:8000, Swagger UI at /docs

# terminal 2, from frontend/
npm run dev                            # proxies /api to :8000
```

- `GEMINI_API_KEY` must be set in the repo-root `.env` for classify and Bill Check. Without it, classify returns `fallback` and Bill Check returns `retake` / `model_error`. Use `?mock=ok` to work on the result screen without a key.
- `GOOGLE_PLACES_API_KEY` is optional. Without it, `google` is always `null`.
- The backend re-seeds SQLite from `data/` on every start, so Coverage Reports posted during testing disappear on restart. That is expected.
- Demo Facilities (`d001`, ...) have invented Coverage Reports, so they are the ones to use when testing coverage badges.
