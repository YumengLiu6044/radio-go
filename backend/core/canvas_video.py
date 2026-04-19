"""
Background canvas videos for published episodes: Bedrock writes a Nova Reel prompt from the script,
runs Amazon Nova Reel async text-to-video, stores MP4 in S3, and records bucket/key on the audio-books row.

Env (optional — if disabled or no bucket, publishing still works; UI keeps local placeholder loops):
  NOVA_REEL_ENABLED     default on when CANVAS_VIDEO_S3_BUCKET or AUDIO_BUCKET_NAME is set; set to 0/false to skip
  CANVAS_VIDEO_S3_BUCKET  overrides AUDIO_BUCKET_NAME for Reel output
  NOVA_REEL_MODEL_ID    default amazon.nova-reel-v1:1
  NOVA_REEL_REGION      Bedrock runtime region (default AWS_REGION; Nova is often us-east-1)
  NOVA_REEL_MAX_CANVAS_SEC  cap canvas clip length (multiple of 6, default 36; max 120)

S3 bucket must allow the Bedrock service to write outputs (see AWS Nova Reel docs).
"""

from __future__ import annotations

import logging
import os
import random
import threading
import time

import boto3
from botocore.exceptions import ClientError

from models import PodcastScript

from .aws import AUDIO_BUCKET_NAME, AWS_REGION, audio_book_table, s3
from .llm import generate_backdrop_reel_prompt

log = logging.getLogger("radio_go.canvas_video")


def _cv_log(msg: str) -> None:
    """Always visible in uvicorn console (thread logs are easy to miss)."""
    line = f"[canvas-video] {msg}"
    log.info("%s", line)
    print(line, flush=True)


# TEXT_VIDEO: 512 chars. MULTI_SHOT_AUTOMATED: up to 4000 chars (AWS Nova docs).
NOVA_REEL_PROMPT_MAX_MULTI = 4000


def reel_duration_from_episode_audio_sec(audio_sec: int) -> int:
    """
    MULTI_SHOT_AUTOMATED: durationSeconds must be a multiple of 6 in [12, 120].

    We do **not** match full episode length (that makes Nova very slow). Instead we pick a
    short loop (12–36s by default) that scales slightly with episode length, capped by
    NOVA_REEL_MAX_CANVAS_SEC (default 36).
    """
    s = max(1, int(audio_sec))
    raw_cap = int(os.getenv("NOVA_REEL_MAX_CANVAS_SEC", "36"))
    cap = max(12, min(120, (max(raw_cap, 12) // 6) * 6))

    if s <= 60:
        d = 12
    elif s <= 120:
        d = 18
    elif s <= 180:
        d = 24
    elif s <= 300:
        d = 30
    else:
        d = 36

    return min(cap, d)

NOVA_REEL_MODEL_ID = (os.getenv("NOVA_REEL_MODEL_ID") or "amazon.nova-reel-v1:1").strip()


def _nova_region() -> str:
    return (os.getenv("NOVA_REEL_REGION") or AWS_REGION or "us-east-1").strip()


def _canvas_output_bucket() -> str | None:
    explicit = (os.getenv("CANVAS_VIDEO_S3_BUCKET") or "").strip()
    if explicit:
        return explicit
    return (AUDIO_BUCKET_NAME or "").strip() or None


def nova_reel_pipeline_enabled() -> bool:
    if (os.getenv("NOVA_REEL_ENABLED") or "").strip().lower() in ("0", "false", "no", "off"):
        return False
    return bool(_canvas_output_bucket())


def _bedrock_runtime():
    return boto3.client("bedrock-runtime", region_name=_nova_region())


def _output_prefix(job_id: str) -> str:
    return f"canvas-videos/{job_id}/"


def _output_s3_uri(bucket: str, job_id: str) -> str:
    return f"s3://{bucket}/{_output_prefix(job_id)}".rstrip("/") + "/"


def _find_mp4_key(bucket: str, prefix: str) -> str | None:
    try:
        resp = s3.list_objects_v2(Bucket=bucket, Prefix=prefix, MaxKeys=50)
    except ClientError as e:
        log.warning("list_objects for canvas video failed: %s", e)
        return None
    for obj in resp.get("Contents") or []:
        k = obj.get("Key") or ""
        if k.lower().endswith(".mp4"):
            return k
    return None


def _mark_canvas_status(
    job_id: str,
    *,
    status: str,
    bucket: str | None = None,
    key: str | None = None,
    error: str | None = None,
) -> None:
    values: dict[str, str] = {":s": status}
    parts = ["canvas_video_status = :s"]
    if bucket is not None:
        parts.append("canvas_video_bucket = :b")
        values[":b"] = bucket
    if key is not None:
        parts.append("canvas_video_key = :k")
        values[":k"] = key
    if error is not None:
        parts.append("canvas_video_error = :e")
        values[":e"] = error[:900]
    try:
        audio_book_table.update_item(
            Key={"job_id": job_id},
            UpdateExpression="SET " + ", ".join(parts),
            ExpressionAttributeValues=values,
        )
    except ClientError as e:
        log.warning("Dynamo update canvas fields failed job_id=%s: %s", job_id, e)


def run_canvas_video_job(
    job_id: str,
    script: PodcastScript,
    title: str,
    topic: str,
    episode_audio_sec: int = 120,
) -> None:
    """Blocking: prompt → Nova Reel → S3; updates Dynamo. Run from a background thread."""
    if not nova_reel_pipeline_enabled():
        _cv_log(f"pipeline disabled or no bucket; skip job_id={job_id}")
        return

    bucket = _canvas_output_bucket()
    if not bucket:
        _cv_log(f"no output bucket resolved; skip job_id={job_id}")
        return

    try:
        who = boto3.client("sts", region_name=AWS_REGION).get_caller_identity()
        _cv_log(f"AWS caller: {who.get('Arn', who.get('UserId', '?'))}")
    except ClientError as e:
        _cv_log(f"sts get_caller_identity failed (non-fatal): {e}")

    src = "CANVAS_VIDEO_S3_BUCKET" if (os.getenv("CANVAS_VIDEO_S3_BUCKET") or "").strip() else "AUDIO_BUCKET_NAME"
    reel_sec = reel_duration_from_episode_audio_sec(episode_audio_sec)
    _cv_log(
        f"start job_id={job_id} bucket={bucket} (from {src}) "
        f"nova_region={_nova_region()} model={NOVA_REEL_MODEL_ID} app_region={AWS_REGION} "
        f"episode_audio_sec={episode_audio_sec} reel_duration_sec={reel_sec}"
    )

    br = _bedrock_runtime()
    try:
        _mark_canvas_status(job_id, status="generating")
    except Exception:
        pass

    try:
        prompt = generate_backdrop_reel_prompt(
            script,
            title=title,
            topic=topic,
            episode_audio_sec=episode_audio_sec,
            reel_render_sec=reel_sec,
        )
        if not prompt:
            raise RuntimeError("Empty backdrop prompt from LLM")
        if len(prompt) > NOVA_REEL_PROMPT_MAX_MULTI:
            prompt = prompt[:NOVA_REEL_PROMPT_MAX_MULTI]
        _cv_log(
            f"reel MULTI_SHOT_AUTOMATED prompt len={len(prompt)} (max {NOVA_REEL_PROMPT_MAX_MULTI}) "
            f"preview={prompt[:80]!r}…"
        )

        out_uri = _output_s3_uri(bucket, job_id)
        _cv_log(f"Reel S3 output prefix uri={out_uri}")
        model_input = {
            "taskType": "MULTI_SHOT_AUTOMATED",
            "multiShotAutomatedParams": {"text": prompt},
            "videoGenerationConfig": {
                "durationSeconds": reel_sec,
                "fps": 24,
                "dimension": "1280x720",
                "seed": random.randint(0, 2_147_483_646),
            },
        }
        start = br.start_async_invoke(
            modelId=NOVA_REEL_MODEL_ID,
            modelInput=model_input,
            outputDataConfig={"s3OutputDataConfig": {"s3Uri": out_uri}},
        )
        arn = start.get("invocationArn")
        if not arn:
            raise RuntimeError("start_async_invoke returned no invocationArn")
        _cv_log(f"StartAsyncInvoke ok invocationArn={arn}")

        deadline = time.monotonic() + float(os.getenv("NOVA_REEL_MAX_WAIT_SEC", "900"))
        poll_sec = float(os.getenv("NOVA_REEL_POLL_SEC", "15"))
        status = "InProgress"
        poll_n = 0
        while time.monotonic() < deadline:
            inv = br.get_async_invoke(invocationArn=arn)
            status = str(inv.get("status") or "")
            poll_n += 1
            if poll_n == 1 or status in ("Completed", "Failed"):
                _cv_log(f"GetAsyncInvoke #{poll_n} status={status}")
            if status == "Completed":
                break
            if status == "Failed":
                msg = str(inv.get("failureMessage") or "Nova Reel job failed")
                raise RuntimeError(msg)
            time.sleep(poll_sec)

        if status != "Completed":
            raise TimeoutError(f"Nova Reel still {status} after wait budget")

        prefix = _output_prefix(job_id)
        candidate_key = f"{prefix}output.mp4"
        try:
            s3.head_object(Bucket=bucket, Key=candidate_key)
            final_key = candidate_key
            _cv_log(f"S3 head_object ok key={final_key}")
        except ClientError as e:
            _cv_log(f"S3 head_object miss key={candidate_key} err={e}; listing prefix…")
            final_key = _find_mp4_key(bucket, prefix) or candidate_key
            _cv_log(f"resolved mp4 key={final_key}")

        _mark_canvas_status(job_id, status="ready", bucket=bucket, key=final_key)
        _cv_log(f"Dynamo updated ready job_id={job_id} s3://{bucket}/{final_key}")
    except Exception as e:
        log.exception("Canvas video job failed job_id=%s", job_id)
        _cv_log(f"FAILED job_id={job_id} {type(e).__name__}: {e}")
        _mark_canvas_status(job_id, status="failed", error=str(e))


def spawn_canvas_video_generation(
    job_id: str,
    script: PodcastScript,
    title: str,
    topic: str,
    episode_audio_sec: int = 120,
) -> None:
    """Fire-and-forget background thread (confirm handler returns immediately)."""

    def run() -> None:
        try:
            _cv_log(f"background thread started job_id={job_id}")
            run_canvas_video_job(job_id, script, title, topic, episode_audio_sec=episode_audio_sec)
        except Exception:
            log.exception("Unhandled canvas video thread job_id=%s", job_id)

    threading.Thread(
        target=run,
        daemon=True,
        name=f"canvas-video-{job_id[:8]}",
    ).start()
