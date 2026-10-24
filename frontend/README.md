# Haki Afya frontend

React + Vite + TypeScript + Tailwind. The plan and tracker is [`../frontend.md`](../frontend.md).

```bash
npm install
npm run dev      # http://localhost:5173, /api is proxied to the backend on :8000
npm run build    # outputs dist/, which FastAPI serves in production
npm run lint
```

Start the backend first (`cd ../backend && . .venv/bin/activate && uvicorn app.main:app --reload`). The footer shows a green dot in dev when the API is reachable.
