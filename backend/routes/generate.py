import json
import os
import uuid
from bs4 import BeautifulSoup
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
import requests
from core import sqs, QUEUE_URL, generate_tts_script, audio_book_table
from models import ConvertTextRequest, ConvertUrlRequest, EnqueueRequest, VoiceType
import re
from botocore.exceptions import ClientError
from core.textract_pdf import TextractConfigError, extract_corpus_from_pdf_files

generation_route = APIRouter(prefix="/generate", tags=["generate"])

@generation_route.post("/generate-from-text")
async def generate_from_text(params: ConvertTextRequest):
    return {
        "script": generate_tts_script(
            params.text_body,
            params.audio_length,
            params.voice_type_host,
            params.voice_type_guest,
            params.style,
            params.topic,
            params.single
        ),
    }

@generation_route.post("/generate-from-url")
async def generate_from_url(params: ConvertUrlRequest):
    corpus = ""
    for url in params.urls:
        scrape_response = requests.get(url)
        scrape_response.raise_for_status()

        soup = BeautifulSoup(scrape_response.text, "html.parser")

        # Remove unwanted elements
        for tag in soup(["script", "style", "noscript", "header", "footer", "nav", "aside"]):
            tag.decompose()

        # Extract all visible text
        text = soup.get_text()

        # Normalize whitespace
        text = re.sub(r"\n\s*\n", "\n\n", text)  # remove excessive blank lines
        text = re.sub(r"[ \t]+", " ", text)  # collapse spaces

        corpus += text + "\n\n"

    return {
        "script": generate_tts_script(
            corpus,
            params.audio_length,
            params.voice_type_host,
            params.voice_type_guest,
            params.style,
            params.topic,
            params.single

        ),
    }

@generation_route.post("/generate-from-docs")
async def generate_from_docs(
    user_id: str = Form(default="demo-user"),
    voice_type_host: VoiceType = Form(default=VoiceType.NEUTRAL_PROFESSIONAL),
    voice_type_guest: VoiceType = Form(default=VoiceType.FEMALE_ENERGETIC),
    audio_length: int = Form(default=120),
    topic: str = Form(default="Episode topic"),
    topic_id: str = Form(default="history"),
    style: str = Form(default="Interview"),
    single: bool = Form(default=False),
    file: UploadFile | None = File(
        default=None,
        description="PDF document (choose a file to generate; defaults to none in /docs until you pick one)",
    ),
):
    _ = user_id  # reserved for future persistence; aligns with other convert endpoints
    _ = topic_id  # aligns with JSON convert endpoints / library grouping

    if file is None:
        raise HTTPException(status_code=400, detail="Upload a PDF in `file`.")

    name = file.filename or "document.pdf"
    body = await file.read()
    if not body:
        raise HTTPException(status_code=400, detail=f"Empty file: {name}")

    prepared = [(name, body)]

    try:
        corpus = extract_corpus_from_pdf_files(prepared)
    except TextractConfigError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except TimeoutError as e:
        raise HTTPException(status_code=504, detail=str(e)) from e
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    except ClientError as e:
        raise HTTPException(status_code=502, detail=f"AWS error: {e}") from e

    if not corpus.strip():
        raise HTTPException(
            status_code=400,
            detail="No text could be extracted from the PDF (empty or unsupported content).",
        )

    corpus = re.sub(r"\n\s*\n", "\n\n", corpus)
    corpus = re.sub(r"[ \t]+", " ", corpus)

    return {
        "script": generate_tts_script(
            corpus,
            audio_length,
            voice_type_host,
            voice_type_guest,
            style,
            topic,
            single
        ),
    }


@generation_route.post("/confirm")
async def confirm(param: EnqueueRequest):
    # Prefer live env (matches app load_dotenv); module-level QUEUE_URL can be stale if .env was wrong at import.
    queue_url = (os.getenv("SQS_URL") or "").strip() or (str(QUEUE_URL).strip() if QUEUE_URL else "")
    if not queue_url:
        raise HTTPException(
            status_code=503,
            detail="SQS_URL is not set in the backend environment. Create a FIFO SQS queue, set SQS_URL in .env, "
            "or run: python scripts/ensure_aws_resources.py (from the backend folder).",
        )

    job_id = str(uuid.uuid4())

    # Insert audio record
    record = {
        "user_id": param.user_id,
        "job_id": job_id,
        "total_lines": len(param.script.lines),
        "title": param.script.summarized_title,
        "topic": param.topic,
        "topic_id": param.topic_id,
        "style": param.style,
        "length": param.audio_length,
    }
    audio_book_table.put_item(Item=record)

    # Enqueue jobs
    for i, line in enumerate(param.script.lines):
        message = {
            "job_id": job_id,
            "line_id": i,
            "speaker": line.speaker.value,
            "text": line.text,
            "voice_type": line.voice_type.value,
            "total": len(param.script.lines),
        }

        sqs.send_message(
            QueueUrl=queue_url,
            MessageBody=json.dumps(message),
            MessageGroupId=job_id,
            MessageDeduplicationId=f"{job_id}-{i}",
        )

    # Visible in uvicorn console without extra logging config
    print(
        f"[generate/confirm] job_id={job_id} user_id={param.user_id} "
        f"lines={len(param.script.lines)} messages sent to SQS queue={queue_url.split('/')[-1]}",
        flush=True,
    )
    return record
