from typing import List
from pydantic import BaseModel
from .llm_schema import PodcastScript, VoiceType


class BaseConvertRequest(BaseModel):
    user_id: str
    voice_type_host: VoiceType
    voice_type_guest: VoiceType
    audio_length: int
    topic: str
    style: str
    single: bool = False


class ConvertTextRequest(BaseConvertRequest):
    text_body: str


class ConvertUrlRequest(BaseConvertRequest):
    urls: List[str]


class EnqueueRequest(BaseConvertRequest):
    script: PodcastScript
