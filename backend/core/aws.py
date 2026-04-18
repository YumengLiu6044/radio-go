import boto3
import os
import json
import uuid


AWS_REGION = os.getenv("AWS_DEFAULT_REGION", "us-east-1")
QUEUE_URL = os.getenv("SQS_URL")

sqs = boto3.client("sqs", region_name=AWS_REGION)
