from enum import Enum
from pydantic import BaseModel
from typing import List

class Roles(str, Enum):
    HOST = "host"
    GUEST = "guest"


class VoiceType(str, Enum):
    FEMALE = "female"
    MALE = "male"


class DialogueLine(BaseModel):
    speaker: Roles
    text: str
    voice_type: VoiceType


class PodcastScript(BaseModel):
    lines: List[DialogueLine]
