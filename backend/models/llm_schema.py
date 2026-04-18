from enum import Enum
from pydantic import BaseModel
from typing import List

class Roles(str, Enum):
    HOST = "host"
    GUEST = "guest"


class VoiceType(str, Enum):
    MALE_DEEP = "male_deep"
    MALE_CASUAL = "male_casual"
    FEMALE_SOFT = "female_soft"
    FEMALE_ENERGETIC = "female_energetic"
    NEUTRAL_PROFESSIONAL = "neutral_professional"


class DialogueLine(BaseModel):
    speaker: Roles
    text: str
    voice_type: VoiceType


class PodcastScript(BaseModel):
    lines: List[DialogueLine]
