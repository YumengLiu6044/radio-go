"""
Idempotently create AWS resources used by POST /generate/confirm and the inference worker.

Run from the backend directory (same place as .env):
  python scripts/ensure_aws_resources.py

Requires AWS credentials (profile or env) and AWS_DEFAULT_REGION matching your app.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv

BACKEND_ROOT = Path(__file__).resolve().parent.parent
# Prefer values from backend/.env over inherited shell (CI/sandbox often sets AWS_DEFAULT_REGION).
load_dotenv(BACKEND_ROOT / ".env", override=True)

REGION = os.getenv("AWS_DEFAULT_REGION") or os.getenv("AWS_REGION", "us-east-1")
AUDIO_BOOKS = os.getenv("DYNAMODB_AUDIO_BOOKS_TABLE", "audio-books")
BOOK_PARTS = os.getenv("DYNAMODB_BOOK_PARTS_TABLE", "book-parts")
QUEUE_NAME = os.getenv("SQS_QUEUE_NAME", "podcast-tts-dev.fifo")


def ensure_audio_books_table(client) -> None:
    try:
        client.describe_table(TableName=AUDIO_BOOKS)
        print(f"DynamoDB OK: {AUDIO_BOOKS}")
        return
    except ClientError as e:
        if e.response["Error"]["Code"] != "ResourceNotFoundException":
            raise
    print(f"Creating DynamoDB table {AUDIO_BOOKS} …")
    client.create_table(
        TableName=AUDIO_BOOKS,
        BillingMode="PAY_PER_REQUEST",
        KeySchema=[{"AttributeName": "job_id", "KeyType": "HASH"}],
        AttributeDefinitions=[
            {"AttributeName": "job_id", "AttributeType": "S"},
            {"AttributeName": "user_id", "AttributeType": "S"},
        ],
        GlobalSecondaryIndexes=[
            {
                "IndexName": "user_id_index",
                "KeySchema": [{"AttributeName": "user_id", "KeyType": "HASH"}],
                "Projection": {"ProjectionType": "ALL"},
            }
        ],
    )
    client.get_waiter("table_exists").wait(TableName=AUDIO_BOOKS)
    print(f"Created {AUDIO_BOOKS} (wait until ACTIVE if you query immediately).")


def ensure_book_parts_table(client) -> None:
    try:
        client.describe_table(TableName=BOOK_PARTS)
        print(f"DynamoDB OK: {BOOK_PARTS}")
        return
    except ClientError as e:
        if e.response["Error"]["Code"] != "ResourceNotFoundException":
            raise
    print(f"Creating DynamoDB table {BOOK_PARTS} …")
    client.create_table(
        TableName=BOOK_PARTS,
        BillingMode="PAY_PER_REQUEST",
        KeySchema=[
            {"AttributeName": "job_id", "KeyType": "HASH"},
            {"AttributeName": "line_id", "KeyType": "RANGE"},
        ],
        AttributeDefinitions=[
            {"AttributeName": "job_id", "AttributeType": "S"},
            {"AttributeName": "line_id", "AttributeType": "N"},
        ],
    )
    client.get_waiter("table_exists").wait(TableName=BOOK_PARTS)
    print(f"Created {BOOK_PARTS}.")


def ensure_fifo_queue(sqs) -> str:
    if not QUEUE_NAME.endswith(".fifo"):
        print("SQS_QUEUE_NAME must end with .fifo (FIFO queue required for MessageGroupId).", file=sys.stderr)
        sys.exit(1)
    try:
        out = sqs.get_queue_url(QueueName=QUEUE_NAME)
        url = out["QueueUrl"]
        print(f"SQS OK: {url}")
        return url
    except ClientError as e:
        if e.response["Error"]["Code"] != "AWS.SimpleQueueService.NonExistentQueue":
            raise
    print(f"Creating FIFO queue {QUEUE_NAME} …")
    out = sqs.create_queue(
        QueueName=QUEUE_NAME,
        Attributes={
            "FifoQueue": "true",
            "ContentBasedDeduplication": "false",
            "VisibilityTimeout": "300",
        },
    )
    url = out["QueueUrl"]
    print(f"Created: {url}")
    return url


def main() -> None:
    dd = boto3.client("dynamodb", region_name=REGION)
    sqs = boto3.client("sqs", region_name=REGION)

    ensure_audio_books_table(dd)
    ensure_book_parts_table(dd)
    url = ensure_fifo_queue(sqs)

    print()
    print("Add or merge into backend/.env:")
    print(f"AWS_DEFAULT_REGION={REGION}")
    print(f"SQS_URL={url}")
    if AUDIO_BOOKS != "audio-books":
        print(f"DYNAMODB_AUDIO_BOOKS_TABLE={AUDIO_BOOKS}")
    if BOOK_PARTS != "book-parts":
        print(f"DYNAMODB_BOOK_PARTS_TABLE={BOOK_PARTS}")


if __name__ == "__main__":
    main()
