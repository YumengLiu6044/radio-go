"""
Delete all objects under the canvas-videos/ prefix in the audio (or canvas) bucket.

Uses backend/.env for AUDIO_BUCKET_NAME / CANVAS_VIDEO_S3_BUCKET and AWS credentials.
Run from repo:  python backend/scripts/clear_canvas_s3_prefix.py
Or cd backend:  python scripts/clear_canvas_s3_prefix.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv

_backend = Path(__file__).resolve().parent.parent
load_dotenv(_backend / ".env", override=False)

REGION = os.getenv("AWS_DEFAULT_REGION") or os.getenv("AWS_REGION", "us-east-1")
BUCKET = (os.getenv("CANVAS_VIDEO_S3_BUCKET") or os.getenv("AUDIO_BUCKET_NAME") or "").strip()
PREFIX = "canvas-videos/"


def main() -> int:
    if not BUCKET:
        print("Set AUDIO_BUCKET_NAME or CANVAS_VIDEO_S3_BUCKET in backend/.env", file=sys.stderr)
        return 1
    s3 = boto3.client("s3", region_name=REGION)
    deleted = 0
    try:
        paginator = s3.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=BUCKET, Prefix=PREFIX):
            for obj in page.get("Contents") or []:
                key = obj["Key"]
                s3.delete_object(Bucket=BUCKET, Key=key)
                deleted += 1
                print(f"deleted s3://{BUCKET}/{key}")
    except ClientError as e:
        print(e, file=sys.stderr)
        return 1
    print(f"Done. Removed {deleted} object(s) under s3://{BUCKET}/{PREFIX}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
