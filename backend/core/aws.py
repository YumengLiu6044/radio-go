import boto3
import os

AWS_REGION = os.getenv("AWS_DEFAULT_REGION") or os.getenv("AWS_REGION", "us-east-1")
QUEUE_URL = os.getenv("SQS_URL")

DYNAMODB_AUDIO_BOOKS_TABLE = os.getenv("DYNAMODB_AUDIO_BOOKS_TABLE", "audio-books")
DYNAMODB_BOOK_PARTS_TABLE = os.getenv("DYNAMODB_BOOK_PARTS_TABLE", "book-parts")

sqs = boto3.client("sqs", region_name=AWS_REGION)
s3 = boto3.client("s3", region_name=AWS_REGION)
dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
textract = boto3.client("textract", region_name=AWS_REGION)

audio_book_table = dynamodb.Table(DYNAMODB_AUDIO_BOOKS_TABLE)
book_parts = dynamodb.Table(DYNAMODB_BOOK_PARTS_TABLE)

TEXTRACT_BUCKET = os.getenv("TEXTRACT_S3_BUCKET")
AUDIO_BUCKET_NAME = os.getenv("AUDIO_BUCKET_NAME")
