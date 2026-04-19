"""
Send a single test message to the same FIFO queue as POST /generate/confirm.

Run from the backend folder:
  python scripts/send_test_sqs_message.py

Uses backend/.env (and optional backend/env) for SQS_URL / AWS credentials.
Message shape matches backend/routes/generate.py (voice_type must be exact enum strings).
"""
from __future__ import annotations

import json
import sys
import uuid
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from dotenv import load_dotenv

load_dotenv(_BACKEND / ".env", override=True)
load_dotenv(_BACKEND / "env", override=False)

from core import QUEUE_URL, sqs  # noqa: E402

# Same string as backend `VoiceType.NEUTRAL_PROFESSIONAL.value`
VOICE_NEUTRAL = "Gender neutral professional voice"


def main() -> None:
    if not QUEUE_URL or not str(QUEUE_URL).strip():
        raise SystemExit("SQS_URL missing: set it in backend/.env")

    job_id = str(uuid.uuid4())
    i = 0
    message = {
        "job_id": job_id,
        "line_id": i,
        "speaker": "host",
        "text": "Hello, this is a test message.",
        "voice_type": VOICE_NEUTRAL,
        "total": 1,
    }

    response = sqs.send_message(
        QueueUrl=str(QUEUE_URL).strip(),
        MessageBody=json.dumps(message),
        MessageGroupId=job_id,
        MessageDeduplicationId=f"{job_id}-{i}",
    )
    print("Sent! MessageId:", response["MessageId"])
    print("job_id:", job_id, "(use this in GET /streaming/status?job_id=… if audio-books has this job)")


if __name__ == "__main__":
    main()
