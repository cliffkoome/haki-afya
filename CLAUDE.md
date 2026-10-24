# Haki Afya

Hackathon build (ends 9:00 PM EAT today). Two devs, each running Claude Code: one on `backend/`, one on `frontend/`.

## Read first, every session
- `document.md`: the full brief. Sections 5 (hard rules) and 9 (API contract) are binding.
- `GLOSSARY.md`: use these exact terms in code, UI text and commit messages (e.g. `CoverageReport`, `ServiceCategory`, `Flag`, never "review", "symptom", "alert").

## Rules
- **The API contract in `document.md` section 9 is the boundary between backend and frontend.** Don't change a request or response shape without updating that section first and saying so to the user.
- **AI reads, code decides.** Gemma extracts and classifies; only the rules engine (plain code over `data/tariffs.json`) produces Flags.
- **Never invent data.** Don't make up tariff amounts, SHA contact details, facility names, coordinates or services. If a value is missing, leave it empty and tell the user.
- **Never store Bill images.** Process in memory only.
- **Invented Coverage Reports only on Demo Facilities** (`is_demo = true`). The seed script must reject anything else.
- **Flag and UI wording never accuses.** No "illegal", "fraud", "overcharge". State the Tariff, the amount charged, and a question to ask.
- **No medical advice.** Care Needs map only to a Service Category. Emergency keywords are checked in code before any Gemma call.
- Every user-facing string exists in English and Swahili.
- Secrets come from env vars (`GEMINI_API_KEY`, `GOOGLE_PLACES_API_KEY`). Never commit them.

## Stack
- Backend: Python 3.12, FastAPI, Pydantic, `google-genai` (model `gemma-4-31b-it`), SQLite re-seeded from `data/` on start. Prompts live in `backend/prompts/`.
- Frontend: React + Vite + TypeScript, Tailwind, Leaflet/OpenStreetMap. Mobile-first PWA. Served by FastAPI from `frontend/dist`.
- Deploy: one Render web service (HTTPS is required for camera and location).

## Testing
- Rules engine: unit tests from fixed Line Items in `backend/tests/` (no network calls).
- Run backend tests with `pytest` from `backend/`.
