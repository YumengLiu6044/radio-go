from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from core import audio_book_table, book_parts, s3, AUDIO_BUCKET_NAME
from boto3.dynamodb.conditions import Key
import numpy as np
import soundfile as sf
import io

streaming_route = APIRouter(prefix="/streaming", tags=["streaming"])

def get_job_record(job_id: str):
    # Validate job id
    response = audio_book_table.get_item(Key={"job_id": job_id})
    if "Item" not in response:
        raise HTTPException(status_code=404, detail="Job not found")

    return response["Item"]


def get_parts(job_id: str):
    return book_parts.query(KeyConditionExpression=Key("job_id").eq(job_id)).get("Items", [])


@streaming_route.get("/status")
async def get_job_status(job_id: str):
    audio_record = get_job_record(job_id)
    total_lines = int(audio_record["total_lines"])

    parts = get_parts(job_id)
    received = len(parts)
    return {
        "job_id": job_id,
        "status": "in_progress" if received < total_lines else "completed",
        "parts_received": received,
        "total_lines": total_lines,
    }

@streaming_route.get("/podcasts")
async def get_podcasts(user_id: str):
    audio_records = audio_book_table.query(
        IndexName="user_id_index",
        KeyConditionExpression=Key("user_id").eq(user_id)
    )

    return audio_records.get("Items", [])

@streaming_route.get("/stream-url")
async def get_streaming_urls(job_id: str):
    audio_record = get_job_record(job_id)
    total_lines = audio_record["total_lines"]

    parts = get_parts(job_id)

    if len(parts) < total_lines:
        raise HTTPException(status_code=404, detail="Job not completed")

    # ensure correct ordering
    parts = sorted(parts, key=lambda x: x["line_id"])

    audio_arrays = []
    sample_rate = None

    for part in parts:
        key = part["uri"]

        obj = s3.get_object(
            Bucket=AUDIO_BUCKET_NAME,
            Key=key
        )

        body = obj["Body"].read()  # StreamingBody -> bytes

        data, sr = sf.read(io.BytesIO(body))

        if sample_rate is None:
            sample_rate = sr
        elif sr != sample_rate:
            raise HTTPException(status_code=500, detail="Sample rate mismatch")

        audio_arrays.append(data)

    # concatenate all chunks
    full_audio = np.concatenate(audio_arrays, axis=0)

    buffer = io.BytesIO()
    sf.write(buffer, full_audio, sample_rate, format="WAV")
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="audio/wav",
        headers={
            "Content-Disposition": f'attachment; filename="{job_id}.wav"'
        },
    )