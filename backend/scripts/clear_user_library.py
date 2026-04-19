"""
Remove all generated podcasts for a DynamoDB user: audio-books rows, book-parts rows,
and S3 objects under `{job_id}/` plus `canvas-videos/{job_id}/` in the audio bucket.

Uses backend/.env (same as the API). Does NOT purge the whole SQS queue.

Usage (dry-run — lists what would be removed):
  cd backend
  python scripts/clear_user_library.py --user-id demo-user

Apply deletes:
  python scripts/clear_user_library.py --user-id demo-user --execute
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError
from dotenv import load_dotenv

_backend = Path(__file__).resolve().parent.parent
load_dotenv(_backend / ".env", override=False)

REGION = os.getenv("AWS_DEFAULT_REGION") or os.getenv("AWS_REGION", "us-east-1")
AUDIO_BOOKS = os.getenv("DYNAMODB_AUDIO_BOOKS_TABLE", "audio-books")
BOOK_PARTS = os.getenv("DYNAMODB_BOOK_PARTS_TABLE", "book-parts")
BUCKET = (os.getenv("AUDIO_BUCKET_NAME") or "").strip()
USER_INDEX = "user_id_index"


def _delete_s3_prefix(s3, bucket: str, prefix: str) -> int:
    n = 0
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for obj in page.get("Contents") or []:
            key = obj["Key"]
            s3.delete_object(Bucket=bucket, Key=key)
            n += 1
    return n


def _query_all_jobs(table, user_id: str) -> list[dict]:
    items: list[dict] = []
    kwargs: dict = {
        "IndexName": USER_INDEX,
        "KeyConditionExpression": Key("user_id").eq(user_id),
    }
    while True:
        resp = table.query(**kwargs)
        items.extend(resp.get("Items", []))
        lek = resp.get("LastEvaluatedKey")
        if not lek:
            break
        kwargs["ExclusiveStartKey"] = lek
    return items


def _delete_book_parts(table, job_id: str, execute: bool) -> int:
    n = 0
    kwargs: dict = {"KeyConditionExpression": Key("job_id").eq(job_id)}
    while True:
        resp = table.query(**kwargs)
        for row in resp.get("Items", []):
            lid = row["line_id"]
            n += 1
            if execute:
                table.delete_item(Key={"job_id": job_id, "line_id": lid})
        lek = resp.get("LastEvaluatedKey")
        if not lek:
            break
        kwargs["ExclusiveStartKey"] = lek
    return n


def main() -> int:
    p = argparse.ArgumentParser(description="Clear generated podcasts for one user_id in DynamoDB + S3.")
    p.add_argument("--user-id", default="demo-user", help="Dynamo user_id (default: demo-user)")
    p.add_argument(
        "--execute",
        action="store_true",
        help="Perform deletes. Without this flag, only prints what would be removed.",
    )
    args = p.parse_args()

    if not BUCKET:
        print("AUDIO_BUCKET_NAME must be set in backend/.env", file=sys.stderr)
        return 1

    dynamodb = boto3.resource("dynamodb", region_name=REGION)
    ab = dynamodb.Table(AUDIO_BOOKS)
    bp = dynamodb.Table(BOOK_PARTS)
    s3 = boto3.client("s3", region_name=REGION)

    try:
        jobs = _query_all_jobs(ab, args.user_id)
    except ClientError as e:
        print(f"Query audio-books failed: {e}", file=sys.stderr)
        return 1

    if not jobs:
        print(f"No rows in {AUDIO_BOOKS} for user_id={args.user_id!r}")
        return 0

    mode = "EXECUTE" if args.execute else "DRY-RUN"
    print(f"{mode}: user_id={args.user_id!r} jobs={len(jobs)} bucket={BUCKET!r}")

    total_s3 = 0
    total_parts = 0
    for row in jobs:
        job_id = str(row.get("job_id", ""))
        if not job_id:
            continue
        title = row.get("title", "")
        print(f"  job_id={job_id} title={title!r}")

        n_parts = _delete_book_parts(bp, job_id, execute=args.execute)
        total_parts += n_parts
        print(f"    book-parts rows: {n_parts}")

        audio_prefix = f"{job_id}/"
        canvas_prefix = f"canvas-videos/{job_id}/"
        if args.execute:
            s1 = _delete_s3_prefix(s3, BUCKET, audio_prefix)
            s2 = _delete_s3_prefix(s3, BUCKET, canvas_prefix)
            total_s3 += s1 + s2
            print(f"    S3 deleted: {s1} under {audio_prefix!r}, {s2} under {canvas_prefix!r}")
        else:
            # count only (cheap list without delete)
            for pref, label in ((audio_prefix, "audio"), (canvas_prefix, "canvas")):
                cnt = 0
                for page in s3.get_paginator("list_objects_v2").paginate(Bucket=BUCKET, Prefix=pref):
                    cnt += len(page.get("Contents") or [])
                print(f"    S3 would delete ~{cnt} object(s) ({label} prefix {pref!r})")

        if args.execute:
            ab.delete_item(Key={"job_id": job_id})
            print(f"    audio-books row deleted")

    if args.execute:
        print(f"Done. Removed {len(jobs)} job(s), {total_parts} book-part row(s), S3 objects counted per job above.")
    else:
        print("Dry-run finished. Re-run with --execute to delete.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
