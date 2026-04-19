import logging

from dotenv import load_dotenv

load_dotenv()
from botocore.exceptions import ClientError
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from routes import generation_route, streaming_route


log = logging.getLogger("radio_go.aws")

app = FastAPI()

@app.exception_handler(ClientError)
async def aws_client_error_handler(request, exc: ClientError):
    """Bedrock/boto failures otherwise surface as opaque 500 + plain text in Swagger."""
    err = (exc.response or {}).get("Error", {})
    code = err.get("Code", exc.__class__.__name__)
    msg = err.get("Message", str(exc))
    # Handled exceptions do not print tracebacks; log so the uvicorn console shows the failure.
    log.warning("AWS ClientError on %s %s — %s: %s", request.method, request.url.path, code, msg)
    return JSONResponse(
        status_code=502,
        content={"detail": f"{code}: {msg}"},
    )


app.include_router(generation_route)
app.include_router(streaming_route)