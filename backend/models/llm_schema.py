from enum import Enum
from pydantic import BaseModel
from typing import List

class Roles(str, Enum):
    HOST = "host"
    GUEST = "guest"


class VoiceType(str, Enum):
    MALE_DEEP = "Male slow and deep voice"
    MALE_CASUAL = "Male casual voice"
    FEMALE_SOFT = "Soft and relaxed female voice"
    FEMALE_ENERGETIC = "Energetic and expressive female voice"
    NEUTRAL_PROFESSIONAL = "Gender neutral professional voice"


class DialogueLine(BaseModel):
    speaker: Roles
    text: str
    voice_type: VoiceType


class PodcastScript(BaseModel):
    lines: List[DialogueLine]
    summarized_title: str
