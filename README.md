# Haki Afya

Photograph your hospital bill and see in 30 seconds what SHA should have covered. Find SHA-contracted facilities near you that actually cover the care you need, and report what really happened so the next patient knows.

Built with **Gemma 4** for the Hacktoberfest Hack Day Nairobi x B54. Start with [`document.md`](./document.md) (the full brief) and [`GLOSSARY.md`](./GLOSSARY.md).

> Not legal or medical advice. Tariffs may have changed; confirm with SHA.

## Run locally

```bash
cp .env.example .env            # add GEMINI_API_KEY
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload   # http://localhost:8000/docs
pytest
```

Every endpoint currently returns the example JSON from `document.md` section 9, so the frontend can build against it straight away. `POST /api/bill-check?mock=retake` returns the retake response.

## Layout

| Path | What |
|---|---|
| `backend/` | FastAPI app (`app/`), Gemma prompts (`prompts/`), tests |
| `frontend/` | React + Vite + TypeScript PWA (served by FastAPI from `frontend/dist`) |
| `data/` | Open dataset: facilities, SHA tariff rules, emergency keywords, SHA contacts |
| `demo/` | SAMPLE bills for the demo |

## License

MIT. The `data/` folder is published as an open dataset under the same license.
