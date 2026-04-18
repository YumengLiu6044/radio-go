from pydantic import BaseModel

class BaseConvertRequest(BaseModel):
    user_id: str
    voice_type: str
    audio_length: int
    topic: str

class ConvertTextRequest(BaseConvertRequest):
    text_body: str

class ConvertUrlRequest(BaseConvertRequest):
    url: str

