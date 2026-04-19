import boto3
import json
import os
import time
from model import VOXXPM2Model
from dotenv import load_dotenv
load_dotenv()

AWS_REGION = os.getenv("AWS_DEFAULT_REGION", "us-east-1")
QUEUE_URL = os.getenv("SQS_URL")
BUCKET = os.getenv("S3_BUCKET", "tts-output")

sqs = boto3.client("sqs", region_name=AWS_REGION)
s3 = boto3.client("s3", region_name=AWS_REGION)
dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)

book_parts = dynamodb.Table("book-parts")

model = VOXXPM2Model()


def process_message(job):
    # safe parsing
    voice_type = job["voice_type"]
    text = job["text"]

    audio = model.infer(text, voice_type)

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
    return sqs.receive_message(
        QueueUrl=QUEUE_URL,
        MaxNumberOfMessages=10,
        WaitTimeSeconds=20,      # long polling (IMPORTANT)
        VisibilityTimeout=10
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