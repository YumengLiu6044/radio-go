from fastapi import APIRouter, HTTPException
from core import audio_book_table, book_parts, s3, AUDIO_BUCKET_NAME
from boto3.dynamodb.conditions import Key

streaming_route = APIRouter(prefix="/streaming", tags=["streaming"])

def get_job_record(job_id: str):
    # Validate job id
    response = audio_book_table.get_item(Key={"job_id": job_id}, ProjectionExpression="job_id")
    if "Item" not in response:
        raise HTTPException(status_code=404, detail="Job not found")

    return response["Item"]


def get_parts(job_id: str):
    return book_parts.query(KeyConditionExpression=Key("job_id").eq(job_id)).get("Items", [])


@streaming_route.get("/status")
async def get_job_status(job_id: str):
    audio_record = get_job_record(job_id)
    total_lines = audio_record["total_lines"]

    parts = get_parts(job_id)
    return {
        "job_id": job_id,
        "status": "in_progress" if len(parts) < total_lines else "completed",
    }

@streaming_route.get("/stream-url")
async def get_streaming_urls(job_id: str):
    audio_record = get_job_record(job_id)
    total_lines = audio_record["total_lines"]

    parts = get_parts(job_id)

    if len(parts) < total_lines:
        raise HTTPException(status_code=404, detail="Job not completed")

    urls = [
        s3.generate_presigned_url(
            "get_object",
            Prefix=f"{job_id}/",
            Params={'Bucket': AUDIO_BUCKET_NAME, 'Key': part_record["uri"]},
        )
        for part_record in parts
    ]

    return {"urls": urls}

