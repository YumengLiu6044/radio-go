"""Extract plain text from PDFs.

If ``TEXTRACT_S3_BUCKET`` is set, uses Amazon Textract async document text detection
(multi-page PDFs via S3). If it is unset, uses a local ``pypdf`` extractor so you can
try ``/generate-from-docs`` without AWS (quality may differ from Textract).
"""

from __future__ import annotations
import os
import time
import uuid
import boto3
from botocore.exceptions import ClientError
from core import TEXTRACT_BUCKET


class TextractConfigError(RuntimeError):
    """Missing or invalid environment configuration for Textract + S3."""


def _staging_prefix() -> str:
    p = os.environ.get("TEXTRACT_S3_PREFIX", "textract-uploads/").strip()
    return p if p.endswith("/") else f"{p}/"


def _max_pdf_bytes() -> int:
    raw = os.environ.get("TEXTRACT_MAX_PDF_BYTES", str(35 * 1024 * 1024)).strip()
    return int(raw)

def _resolve_textract_region(bucket: str) -> str:
    """Textract async S3 document APIs must run in the bucket's region.

    - If `TEXTRACT_BUCKET_REGION` is set, use it.
    - Otherwise, detect via `GetBucketLocation`.
    """
    override = (os.environ.get("TEXTRACT_BUCKET_REGION") or "").strip()
    if override:
        return override

    # S3 GetBucketLocation returns None/'' for us-east-1.
    s3_global = boto3.client("s3")
    try:
        resp = s3_global.get_bucket_location(Bucket=bucket)
    except ClientError as e:
        raise TextractConfigError(f"Unable to read bucket location for {bucket}: {e}") from e

    loc = (resp.get("LocationConstraint") or "").strip()
    return loc or "us-east-1"


def _poll_and_collect_lines(
    textract,
    job_id: str,
    *,
    poll_interval_sec: float = 2.0,
    max_wait_sec: float = 600.0,
) -> str:
    deadline = time.time() + max_wait_sec
    while time.time() < deadline:
        resp = textract.get_document_text_detection(JobId=job_id)
        status = resp["JobStatus"]
        if status == "SUCCEEDED":
            lines: list[str] = []
            next_token = None
            while True:
                kwargs: dict = {"JobId": job_id}
                if next_token:
                    kwargs["NextToken"] = next_token
                page = textract.get_document_text_detection(**kwargs)
                for block in page.get("Blocks", []):
                    if block.get("BlockType") == "LINE" and block.get("Text"):
                        lines.append(block["Text"])
                next_token = page.get("NextToken")
                if not next_token:
                    break
            return "\n".join(lines)
        if status == "FAILED":
            msg = resp.get("StatusMessage", "Unknown error")
            raise RuntimeError(f"Textract job failed: {msg}")
        time.sleep(poll_interval_sec)
    raise TimeoutError(f"Textract job {job_id} did not finish within {max_wait_sec} seconds")

def extract_corpus_from_pdf_files(files: list[tuple[str, bytes]]) -> str:
    """Return one corpus string for all PDFs in ``files`` (filename, bytes).

    Uses Textract + S3 when ``TEXTRACT_S3_BUCKET`` is set; otherwise ``pypdf`` locally.
    """
    if not files:
        return ""

    if not TEXTRACT_BUCKET:
        raise TextractConfigError(
            "TEXTRACT_S3_BUCKET is not set. Set it to enable Textract, or unset it to use local PDF extraction."
        )

    max_bytes = _max_pdf_bytes()
    for name, pdf_bytes in files:
        if not pdf_bytes.startswith(b"%PDF"):
            raise ValueError(f"Not a PDF (missing %PDF header): {name}")
        if len(pdf_bytes) > max_bytes:
            raise ValueError(
                f"PDF too large: {name} ({len(pdf_bytes)} bytes). "
                f"Max size is {max_bytes} bytes (override with TEXTRACT_MAX_PDF_BYTES)."
            )

    prefix = _staging_prefix()
    region = _resolve_textract_region(TEXTRACT_BUCKET)
    s3 = boto3.client("s3", region_name=region)
    textract = boto3.client("textract", region_name=region)

    chunks: list[str] = []
    for name, pdf_bytes in files:
        key = f"{prefix}{uuid.uuid4()}.pdf"
        try:
            s3.put_object(
                Bucket=TEXTRACT_BUCKET,
                Key=key,
                Body=pdf_bytes,
                ContentType="application/pdf",
            )
            # If this fails, it's an S3 permissions/policy issue (not Textract).
            s3.head_object(Bucket=TEXTRACT_BUCKET, Key=key)
            start = textract.start_document_text_detection(
                DocumentLocation={"S3Object": {"Bucket": TEXTRACT_BUCKET, "Name": key}},
            )
            job_id = start["JobId"]
            text = _poll_and_collect_lines(textract, job_id)
            if text.strip():
                chunks.append(text.strip())
        finally:
            try:
                s3.delete_object(Bucket=TEXTRACT_BUCKET, Key=key)
            except ClientError:
                pass

    return "\n\n".join(chunks)
