from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.routes import router

REPO_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_DIST = REPO_ROOT / "frontend" / "dist"

load_dotenv(REPO_ROOT / ".env")

app = FastAPI(title="Haki Afya")
app.include_router(router)


# Error shape from document.md section 9: {"error": {"code", "message"}}
@app.exception_handler(HTTPException)
async def http_error(_: Request, exc: HTTPException):
    code = {404: "not_found", 413: "too_large", 422: "invalid_request", 429: "rate_limited"}
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": code.get(exc.status_code, "error"), "message": str(exc.detail)}},
    )


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"error": {"code": "invalid_request", "message": str(exc.errors())}},
    )


# Serve the built frontend from the same origin (one URL, no CORS).
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        file = FRONTEND_DIST / path
        if path and file.is_file():
            return FileResponse(file)
        return FileResponse(FRONTEND_DIST / "index.html")
