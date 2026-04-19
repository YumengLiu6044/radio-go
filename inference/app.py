import boto3
import json
import os
import time
from pathlib import Path

from model import VOXXPM2Model
from dotenv import load_dotenv

_here = Path(__file__).resolve().parent
_repo = _here.parent
# Shared AWS settings usually live in backend/.env; optional overrides in inference/.env
load_dotenv(_repo / "backend" / ".env", override=False)
load_dotenv(_here / ".env", override=True)

AWS_REGION = os.getenv("AWS_DEFAULT_REGION") or os.getenv("AWS_REGION", "us-east-1")
QUEUE_URL = os.getenv("SQS_URL")
# Match streaming route (`AUDIO_BUCKET_NAME`) so stitched playback reads the same objects.
BUCKET = os.getenv("AUDIO_BUCKET_NAME") or os.getenv("S3_BUCKET", "tts-output")
BOOK_PARTS_TABLE = os.getenv("DYNAMODB_BOOK_PARTS_TABLE", "book-parts")

print(f"Using region {AWS_REGION}, S3 bucket {BUCKET}, book-parts table {BOOK_PARTS_TABLE}")

sqs = boto3.client("sqs", region_name=AWS_REGION)
s3 = boto3.client("s3", region_name=AWS_REGION)
dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)

book_parts = dynamodb.Table(BOOK_PARTS_TABLE)

model = VOXXPM2Model()


def process_message(job):
    # safe parsing
    voice_type = job["voice_type"]
    text = job["text"]

    text_prompt = f"({voice_type}) {text}"

    audio = model.infer(text_prompt, voice_type)

    key = f"{job['job_id']}/{job['line_id']}.wav"

    s3.put_object(
        Bucket=BUCKET,
        Key=key,
        Body=audio,
        ContentType="audio/wav"
    )

    book_parts.put_item(
        Item={
            "job_id": job["job_id"],
            "line_id": job["line_id"],
            "uri": key
        }
    )


def poll():
    # Long polling: SQS may wait up to WaitTimeSeconds and return no Messages when the queue
    # is empty — AWS metrics show those as "empty receives"; that is expected (not a bug).
    # VisibilityTimeout must exceed worst-case time to synthesize + S3 + DynamoDB before delete.
    return sqs.receive_message(
        QueueUrl=QUEUE_URL,
        MaxNumberOfMessages=10,
        WaitTimeSeconds=20,
        VisibilityTimeout=300,
    )


def delete_message(msg):
    sqs.delete_message(
        QueueUrl=QUEUE_URL,
        ReceiptHandle=msg["ReceiptHandle"]
    )

while True:
    try:
        response = poll()
        messages = response.get("Messages", [])

        print(f"[POLLED] {len(messages)} messages")

        if not messages:
            continue

        for msg in messages:
            try:
                job = json.loads(msg["Body"])

                process_message(job)

                # only delete AFTER success
                delete_message(msg)

            except Exception as e:
                print(f"[ERROR processing message] {e}")
                # do NOT delete → SQS will retry safely

    except Exception as e:
        print(f"[POLL ERROR] {e}")
        time.sleep(2)