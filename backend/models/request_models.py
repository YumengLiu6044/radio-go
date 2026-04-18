from typing import List

from pydantic import BaseModel

class BaseConvertRequest(BaseModel):
    user_id: str
    voice_type: str
    audio_length: int
    topic: str
    style: str

class ConvertTextRequest(BaseConvertRequest):
    text_body: str

class ConvertUrlRequest(BaseConvertRequest):
    urls: List[str]

