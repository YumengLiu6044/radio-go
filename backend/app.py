import logging
from pathlib import Path

from dotenv import load_dotenv

# Always load backend/.env even if uvicorn is started from the repo root (cwd != backend).
load_dotenv(Path(__file__).resolve().parent / ".env", override=True)

from botocore.exceptions import ClientError
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from routes import generation_route, streaming_route


log = logging.getLogger("radio_go.aws")

app = FastAPI()


@app.middleware("http")
async def log_generate_confirm(request: Request, call_next):
    """Trace /generate/confirm: if you see no lines here, the browser is not hitting this process."""
    path = request.url.path
    log_confirm = request.method == "POST" and path.rstrip("/").endswith("/generate/confirm")
    if log_confirm:
        print(f"[http] POST {path} (client {request.client.host if request.client else '?'})", flush=True)
    try:
        response = await call_next(request)
    except Exception as exc:
        if log_confirm:
            print(f"[http] POST {path} exception: {exc!r}", flush=True)
        raise
    if log_confirm:
        print(f"[http] POST {path} -> HTTP {response.status_code}", flush=True)
    return response


@app.exception_handler(RequestValidationError)
async def request_validation_handler(request: Request, exc: RequestValidationError):
    path = request.url.path
    if "generate" in path and "confirm" in path:
        print(f"[validation] POST {path} body rejected by Pydantic:", flush=True)
        for err in exc.errors():
            print(f"  {err}", flush=True)
    return JSONResponse(status_code=422, content={"detail": exc.errors()})


app.add_middleware(
    CORSMiddleware,
    # Explicit dev origins (preflight-safe).
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    # Vite often picks 5174+ when 5173 is busy; also covers direct :8000 tooling.
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(ClientError)
async def aws_client_error_handler(request, exc: ClientError):
    """Bedrock/boto failures otherwise surface as opaque 500 + plain text in Swagger."""
    err = (exc.response or {}).get("Error", {})
    code = err.get("Code", exc.__class__.__name__)
    msg = err.get("Message", str(exc))
    # Handled exceptions do not print tracebacks; log so the uvicorn console shows the failure.
    log.warning("AWS ClientError on %s %s — %s: %s", request.method, request.url.path, code, msg)
    hint = ""
    if code == "ResourceNotFoundException":
        hint = (
            " Ensure DynamoDB tables exist in AWS_DEFAULT_REGION (audio-books with PK job_id + GSI user_id_index; "
            "book-parts with PK job_id, SK line_id), SQS_URL is a valid FIFO queue URL, and credentials target that "
            "region/account. From backend/: python scripts/ensure_aws_resources.py"
        )
    status = 503 if code == "ResourceNotFoundException" else 502
    return JSONResponse(
        status_code=status,
        content={"detail": f"{code}: {msg}{hint}"},
    )


app.include_router(generation_route)
app.include_router(streaming_route)