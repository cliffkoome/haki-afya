# Haki Afya: Frontend Plan

> Working tracker for the frontend. Tick boxes as pages are finished, and update this file in the same commit as the work.
> Product rules, terms and the API contract live in [`document.md`](./document.md) (sections 5, 6, 9, 10) and [`GLOSSARY.md`](./GLOSSARY.md). Use the glossary words in code and UI.

**Owner:** frontend dev · **Backend:** teammate (mock API already live, see "API" below)
**Stack:** React + Vite + TypeScript, Tailwind, React Router, Leaflet + OpenStreetMap. Mobile-first PWA.

## Current status

_Updated 2026-10-24 16:45 EAT._

- **Done (against the mock API, checked headless at 390px in EN and SW):** app shell, Home, the full Bill Check flow (`/check` → `/check/questions` → `/check/photo` → `/check/result`, incl. retake and error states), Find (`/find`, `/emergency`, `/find/results` with list, Leaflet map, area-picker fallback, Go here → Visit + Maps), the Report prompt bottom sheet on Home, `/about`, and the PWA manifest + icons (`frontend/public/`).
- **Testing tips:** open any page with `?mock=retake` (`src/lib/devMock.ts`, works in production builds too, for the demo) to force the retake response for the session. Wizard state lives in `src/state/BillCheck.tsx` (memory only; a reload sends you back to `/check`). A Visit saved by "Go here" pre-fills `/check`. Open any page with `?backdate=1` (production too) to make saved Visits 3 h old, so the Report prompt shows on Home.
- **Blocked on data (non-devs):** `data/areas.json` is `[]`, so the area picker shows "not available yet". The frontend expects `[{"name": "Kilimani", "lat": -1.29, "lng": 36.78}, ...]`. `data/emergency_keywords.json` is empty, so the frontend's layer-1 keyword check (`src/lib/emergency.ts`, bundled at build) matches nothing yet; the backend classify still decides.
- **Backend:** every endpoint is still a mock. No frontend change should be needed when real ones land, unless the contract changes.
- **Edge cases checked (16:45):** "Looks fair" result, not-listed facility (no name), unregistered Patient (shows a Register with SHA card linking sha.go.ke), long unbroken item names, 7-digit amounts, SHA contacts. No horizontal overflow at 360px.
- **Next:** switch to real endpoints as the backend lands them, polish the result screen, then the testing checklist (real Android phone on the deployed URL, "Add to Home screen").
- **Backend issue raised (16:35):** `spa()` in `backend/app/main.py` serves `FRONTEND_DIST / path` without checking it stays inside `dist/`, so `/..%2f..%2fREADME.md` returns repo files (and on Render `/proc/self/environ` would leak API keys). Fix: resolve the path and require `is_relative_to(FRONTEND_DIST)`.
- **Still open:** real-phone check on the deployed HTTPS URL (camera, location, Copy/Share, dialler).

## Status

| # | Page / piece | Route | Priority | Status |
|---|---|---|---|---|
| 0 | Project setup + app shell | all | P0 | 🟨 code done, real-phone check pending |
| 1 | Home | `/` | P0 | 🟨 code done, real-phone check pending |
| 2 | Bill Check: choose facility | `/check` | P0 | 🟨 code done, real-phone check pending |
| 3 | Bill Check: two questions | `/check/questions` | P0 | 🟨 code done, real-phone check pending |
| 4 | Bill Check: photo + analysing | `/check/photo` | P0 | 🟨 code done, real-phone check pending |
| 5 | Bill Check: result | `/check/result` | P0 | 🟨 code done, real-phone check pending |
| 6 | Find: Care Need | `/find` | P1 | 🟨 code done, real-phone check pending |
| 7 | Emergency | `/emergency` | P1 | 🟨 code done, real-phone check pending |
| 8 | Find: results (list + map) | `/find/results` | P1 | 🟨 code done, real-phone check pending |
| 9 | Report prompt (Visit follow-up) | modal on `/` | P2 | 🟨 code done, real-phone check pending |
| 10 | About, privacy and disclaimer | `/about` | P2 | 🟨 code done, real-phone check pending |
| 11 | Not found | `*` | P2 | 🟨 code done, real-phone check pending |
| 12 | PWA manifest + icons | n/a | P2 | 🟨 code done, "Add to Home screen" check pending |
| 13 | Google rating badge | inside 8 | P3 (drop at 6:00 PM if not working) | 🟨 code done, real-phone check pending |

Status key: ⬜ not started · 🟨 in progress · ✅ done (works on a real phone against the API)

**Build order follows priority:** Bill Check must ship (P0), then Find (P1), then Report (P2). Google ratings come last (P3).

---

## User flows

```
Home ─┬─ "Check a bill" ─► /check ─► /check/questions ─► /check/photo ─► /check/result
      │                     (facility)   (registered? referral?)  (camera, analysing,     (Flags, Desk Script,
      │                                                            retake)                 Complaint Draft)
      │
      ├─ "Find care" ─► /find ─┬─ emergency keywords / Emergency ─► /emergency
      │                (Care Need)
      │                        └─ Service Category ─► /find/results ─► "Go here" (saves a Visit, opens Maps)
      │
      └─ (2h+ after a Visit) ─► Report prompt ─┬─ No / Yes + amount ─► POST /api/reports (Unverified Report)
                                                 └─ "Check my bill" ─► /check (facility pre-filled)
```

---

## 0. Project setup + app shell (P0)

- [x] `npm create vite@latest frontend -- --template react-ts`, add Tailwind, React Router, Leaflet (`react-leaflet`)
- [x] Vite dev proxy: `/api` → `http://localhost:8000` (production is the same origin, so no CORS)
- [x] `src/api/client.ts`: typed functions for every endpoint in document.md section 9, with types copied from the contract
- [x] `src/i18n/`: `en.ts` and `sw.ts` string tables plus a `t(key)` hook. **Every user-facing string goes through `t()`.**
- [x] `src/lib/storage.ts`: `localStorage` helpers wrapped in try/catch (see "Local state")
- [x] **App shell** (every page):
  - [x] Header: "Haki Afya" logo/name (links to `/`), **EN | SW** toggle (remembered)
  - [x] Footer: *"Not legal or medical advice."* + link to `/about`
  - [x] Host for the Report prompt modal
- [x] Mobile-first layout: max width ~480px centred on desktop, 16px side padding, tap targets ≥ 48px, high contrast (readable in sunlight)
- [x] Generate `device_id` (UUID) on first load

**Notes:** all routes resolve (unbuilt pages show a placeholder); the dev-only dot in the footer turns green when `/api/health` answers; design tokens and easing curves live in `src/index.css` (`.pressable` gives every button the 0.97 press).

**Done when:** the shell renders on a phone, the language toggle switches every string, and `GET /api/health` succeeds through the client.

---

## 1. Home `/` (P0)

**Purpose:** two decisions in one tap.

- [x] Big primary button: **Check a bill** → `/check`
- [x] Big secondary button: **Find care** → `/find`
- [x] One-line pitch: *"See what SHA should cover, before you pay."*
- [x] If a Visit is due (≥ 2 h old, unanswered): open the **Report prompt** (page 9)
- [x] Small link: "How it works" → `/about`

**Done when:** both buttons work and the page fits one phone screen without scrolling.

---

## 2. Bill Check: choose facility `/check` (P0)

**Purpose:** know which facility, and so its Facility Level, before the photo.

- [x] If there is a recent Visit: show it pre-selected (*"Mama Lucy Kibaki Hospital?"*) with a **Yes** button
- [x] Search box → `GET /api/facilities/search?q=` (debounce ~250 ms; start at 2 characters)
- [x] Result rows: name, "Level N", a **Demo data** pill if `is_demo`
- [x] **"My facility isn't listed"** → Facility Level picker (2 to 6, with a one-line hint for each level) → continue with no `facility_id`
- [x] Next → `/check/questions`

**States:** searching · no results (offer "not listed") · API error (retry + "not listed")
**Done when:** you can reach step 3 both with a listed facility and with "not listed + level".

---

## 3. Bill Check: two questions `/check/questions` (P0)

One question per screen section, big one-tap answers:

- [x] *"Is the Patient registered with SHA?"* **Yes / No**
- [x] *"Were you referred here, or was this an emergency?"* **Referred / Emergency / Neither**
- [x] If **No** to the first: show a short note, *"Without SHA registration, only emergency care in the first 24 hours is covered."* (still allowed to continue)
- [x] Next → `/check/photo`

**Done when:** both answers are stored in the Bill Check state and Back keeps them.

---

## 4. Bill Check: photo + analysing `/check/photo` (P0)

- [x] Tips card: *"Lay the bill flat · good light · whole bill in view"*
- [x] **Take photo** button: `<input type="file" accept="image/*" capture="environment">`
- [x] Preview the photo + **Use this photo** / **Retake**
- [x] Client-side downscale to ~1600px longest side, JPEG ~0.85, so the upload stays under 8 MB on slow networks
- [x] Submit `POST /api/bill-check` (multipart: `image`, `facility_id` or `facility_level`, `registered`, `referral`, `lang`, `device_id`)
- [x] **Analysing** state: progress message that rotates through *"Reading your bill…"*, *"Checking SHA rules…"*, *"Writing your Desk Script…"*. Can take up to ~30 s.
- [x] `status: "retake"` → show `message`, keep the user on this page, **Retake** button (test with `?mock=retake`)
- [x] `status: "ok"` → `/check/result`
- [x] **Privacy:** the image lives only in memory. Never put it in `localStorage` or `sessionStorage`. Discard it after the response.

**States:** no photo · preview · uploading/analysing · retake · network/timeout error (retry)
**Done when:** a real phone camera photo reaches the API and both mock responses (ok and retake) are handled.

---

## 5. Bill Check: result `/check/result` (P0, the demo moment)

**Top to bottom:**

- [x] **Summary banner:** *"KES 18,280 of your KES 25,800 bill is in question"* (`summary.amount_in_question_kes`, `summary.balance_kes`). If it is 0: *"Looks fair ✓"* in green
- [x] Facility name + level (+ **Demo data** pill if a Demo Facility)
- [x] **Flag cards**, one per Line Item, sorted 🔴 → 🟡 → ⚪ → 🟢:
  - [x] icon + label (Should Be Free / Above Tariff / Unclear / Payable)
  - [x] Line Item description, amount charged
  - [x] `message` (facts and a question, never accusations, comes from the backend as-is)
  - [x] "Source" link if `source_url`
- [x] **Desk Script** card: large readable text + **Copy**
- [x] **Complaint Draft** card: collapsed by default, expand to read, **Copy** + **Share** (Web Share API; fall back to Copy if unavailable)
- [x] SHA contacts list (`sha_contacts`), only if non-empty
- [x] *"Your check was saved anonymously and helps the next patient"* if `verified_report_saved`
- [x] `disclaimer` text
- [x] Buttons: **Check another bill** · **Home**

**Done when:** the mock result looks right on a phone and Copy/Share work. This is the screen the judges see, so polish it first.

---

## 6. Find: Care Need `/find` (P1)

- [x] Text box: *"What care do you need?"* (placeholder example in the current language)
- [x] 8 Service Category chips, so the user can skip typing: Maternity, Dialysis, Imaging (X-ray/CT/MRI), Eye care, General outpatient, Surgery, Cancer care, Emergency
- [x] Submit text → `POST /api/care-need/classify`
  - [x] `is_emergency: true` → `/emergency`
  - [x] `matched_by: "fallback"` → *"Please choose the type of care"* + highlight the chips
  - [x] otherwise → `/find/results?service=<category>`
- [x] Tapping a chip goes straight to results (Emergency chip → `/emergency`)
- [x] Note under the box: *"We don't diagnose. We help you find where your care is covered."*

**Done when:** text and chips both reach results, and an emergency phrase reaches `/emergency`.

---

## 7. Emergency `/emergency` (P1)

**Nothing else on this page.** Red, calm, fast.

- [x] Headline: *"Go to the nearest emergency unit now."*
- [x] *"SHA's Emergency fund covers the first 24 hours of emergency care for every Kenyan, registered or not."*
- [x] Nearest facilities offering `emergency` (`GET /api/facilities?service_category=emergency`), each with **Directions** and the distance
- [x] **Call 999 / 112** buttons (`tel:` links)
- [x] No ratings, no reports, no extra text

**Done when:** it loads in under 2 s on mock data and the call buttons open the dialler.

---

## 8. Find: results `/find/results?service=` (P1)

- [x] **Location:** ask with `navigator.geolocation`. If denied or unavailable → **Area picker** (Nairobi areas from `data/areas.json`, via an endpoint or bundled at build time). Never send or store coordinates beyond the request.
- [x] `GET /api/facilities?service_category=&lat=&lng=&lang=`
- [x] Header: *"Maternity near you"* + **List | Map** toggle
- [x] **Facility card:**
  - [x] name, "Level N", distance
  - [x] **Demo data** pill if `is_demo`
  - [x] `benefit_summary` (what SHA covers here for this service)
  - [x] **Coverage Report badge** (last 90 days): *"4 verified · 2 unverified reports of paying"* and *"1 verified · 3 unverified reports of paying nothing"*. Patterns only, neutral colours, no accusations
  - [x] Google rating `★ 4.1 (212)` + "Google" attribution, only if `google` is not null
  - [x] **Go here** → saves a **Visit** (`facility_id`, `service_category`, `created_at`) then opens `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>`
- [x] **Map view:** Leaflet + OSM tiles, a pin per facility, tap a pin to show its card
- [x] Empty state: *"No listed facilities offer this within 15 km."* + link back

**States:** locating · location denied → area picker · loading · empty · error
**Done when:** results show sorted by distance on a phone, and **Go here** saves a Visit and opens Maps.

---

## 9. Report prompt (Visit follow-up) (P2)

Modal shown on Home when a Visit is ≥ 2 h old and unanswered.

- [x] *"Did you pay anything for maternity at Mama Lucy Kibaki Hospital?"*
- [x] **No** → `POST /api/reports` `{paid: false}` → thank-you
- [x] **Yes** → amount input (KES, numbers only) → `POST /api/reports` `{paid: true, amount_kes}` → thank-you
- [x] **Check my bill** → `/check` with the facility pre-filled
- [x] **Skip** → mark the Visit answered, never ask again
- [x] `429 rate_limited` → *"You already reported this recently. Thank you!"* (mark answered)
- [x] Thank-you: *"Thanks. This helps the next patient."*

**Done when:** every answer marks the Visit answered and the prompt never shows twice for it. For testing, add a dev-only way to backdate a Visit.

---

## 10. About, privacy and disclaimer `/about` (P2)

Useful for judges and trust:

- [x] What Haki Afya does (3 lines)
- [x] **Privacy:** *"We never store your bill photo. We keep only anonymous results: facility, type of care, amount, date."* No accounts.
- [x] **How Bill Check works:** Gemma 4 reads the bill → SHA rules checked by code → you decide
- [x] **Not legal or medical advice.** Tariffs come from published SHA sources and may change; confirm with SHA
- [x] **Open source:** GitHub link, MIT license, open SHA tariff dataset
- [x] **Demo data** explanation: fictional facilities, used only for demonstration

---

## 11. Not found `*` (P2)

- [x] Friendly message + **Home** button

## 12. PWA manifest + icons (P2)

- [x] `manifest.webmanifest` (name, short_name "Haki Afya", theme colour, `display: standalone`), 192/512 icons
- [ ] Test "Add to Home screen" on Android Chrome

## 13. Google rating badge (P3)

- [x] Render only when `google` is non-null in `/api/facilities`, with "Google" attribution. **Drop it at 6:00 PM if the backend isn't returning it.**

---

## Shared components

| Component | Used on | Notes |
|---|---|---|
| `AppShell` (Header, Footer, LanguageToggle) | all | |
| `BigButton` | Home, Questions, Report | full width, ≥ 56px tall |
| `ChoiceGroup` | Questions | one-tap segmented answers |
| `FacilityCard` | Results, Emergency | variants: full / emergency-minimal |
| `DemoPill` | Facility search, Results, Result | *"Demo data"* |
| `CoverageBadge` | FacilityCard | Verified and Unverified counts, neutral wording |
| `FlagCard` | Result | 🔴 🟡 ⚪ 🟢 with the label, amount and message |
| `CopyShareButtons` | Result | Web Share API with Copy fallback |
| `AreaPicker` | Results, Emergency | fallback when location is denied |
| `Modal` | Report prompt | |
| `Spinner` / `ProgressMessages` | Photo, Results | rotating messages |
| `ErrorState` / `EmptyState` | all data pages | with retry |

## Local state

| What | Where | Key |
|---|---|---|
| Language | `localStorage` | `haki.lang` (`en` / `sw`, default `en`) |
| Device ID | `localStorage` | `haki.device_id` (UUID) |
| Visits | `localStorage` | `haki.visits`: `[{facility_id, facility_name, service_category, created_at, answered}]` |
| Bill Check wizard (facility, level, answers) | React context (memory) | not persisted |
| Bill photo | memory only | **never persisted** |
| Last Bill Check result | React context | lost on refresh, which is fine |

All `localStorage` access goes through `src/lib/storage.ts` with try/catch (private mode can throw).

## API (from document.md section 9)

| Call | Used by |
|---|---|
| `GET /api/health` | shell (dev check) |
| `POST /api/care-need/classify` | 6 |
| `GET /api/facilities` | 7, 8 |
| `GET /api/facilities/search` | 2 |
| `POST /api/bill-check` (`?mock=retake` while mocked) | 4 |
| `POST /api/reports` | 9 |

Errors always look like `{"error": {"code", "message"}}`. Show `message` when it helps, otherwise a generic *"Something went wrong. Try again."*

## Language (EN / SW)

- [ ] Every UI string in `en.ts` and `sw.ts`. Ask a fluent Swahili speaker on the team to review `sw.ts` before the demo.
- [ ] Send `lang` to the API, which returns the Desk Script, Complaint Draft and messages in that language.
- [ ] Service Category labels in both languages (e.g. Maternity / Uzazi).

## Testing checklist (before the 7:00 PM freeze)

- [ ] Real Android phone on the **deployed HTTPS URL**: camera opens, location prompt works
- [ ] Full Bill Check with all 3 SAMPLE bills (🔴, 🟡, 🟢 "Looks fair")
- [ ] Retake path
- [ ] Find with location allowed and with location denied (area picker)
- [ ] Emergency phrase in English and in Swahili reaches `/emergency`
- [ ] Report prompt: No, Yes + amount, Check my bill, Skip
- [ ] Language toggle on every page
- [ ] Slow network (Chrome DevTools "Slow 3G"): analysing state, no double submit
