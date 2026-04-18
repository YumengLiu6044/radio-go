from fastapi import APIRouter
from models.request_models import ConvertTextRequest

generation_route = APIRouter()

@generation_route.post("/generate-from-text")
async def generate_from_text(request: ConvertTextRequest):
    ...

@generation_route.post("/generate-from-url")
async def generate_from_url(request: ConvertTextRequest):
    ...

@generation_route.post("/generate-from-docs")
async def generate_from_docs(request: ConvertTextRequest):
    ...
