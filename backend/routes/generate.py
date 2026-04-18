import json
import uuid
from bs4 import BeautifulSoup
from fastapi import APIRouter
import requests
from core import sqs, QUEUE_URL, generate_tts_script
from models import ConvertTextRequest, ConvertUrlRequest, EnqueueRequest
import re

generation_route = APIRouter()

@generation_route.post("/generate-from-text")
async def generate_from_text(params: ConvertTextRequest):
    return {
        "script": generate_tts_script(
            params.text_body,
            params.audio_length,
            params.voice_type_host,
            params.voice_type_guest,
            params.style,
            params.topic
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
            params.topic
        ),
    }

@generation_route.post("/generate-from-docs")
async def generate_from_docs():
    ...


@generation_route.post("/confirm")
async def confirm(param: EnqueueRequest):
    job_id = str(uuid.uuid4())

    for i, line in enumerate(param.script_data.lines):
        message = {
            "job_id": job_id,
            "line_id": i,
            "speaker": line.speaker,
            "text": line.text,
            "voice_type": line.voice_type,
        }

        sqs.send_message(
            QueueUrl=QUEUE_URL,
            MessageBody=json.dumps(message),
        )

    return {
        "job_id": job_id,
        "status": "queued",
        "total_lines": len(param.script_data.lines),
    }
