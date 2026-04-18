import boto3
import os


AWS_REGION = os.getenv("AWS_DEFAULT_REGION", "us-east-1")
QUEUE_URL = os.getenv("SQS_URL")

sqs = boto3.client("sqs", region_name=AWS_REGION)
s3 = boto3.client("s3", region_name=AWS_REGION)
dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)

audio_book_table = dynamodb.Table("audio-books")
book_parts = dynamodb.Table("book-parts")

AUDIO_BUCKET_NAME = os.getenv("AUDIO_BUCKET_NAME")