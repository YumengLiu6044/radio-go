from pydantic import BaseModel
from typing import List

class DialogueLine(BaseModel):
    speaker: str  # "Host" or "Guest"
    text: str

class PodcastScript(BaseModel):
    lines: List[DialogueLine]