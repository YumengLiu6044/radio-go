import re
from enum import Enum
from typing import List

from pydantic import BaseModel, Field

class Roles(str, Enum):
    HOST = "host"
    GUEST = "guest"


class VoiceType(str, Enum):
    MALE_DEEP = "Male slow and deep voice"
    MALE_CASUAL = "Male casual voice"
    FEMALE_SOFT = "Soft and relaxed female voice"
    FEMALE_ENERGETIC = "Energetic and expressive female voice"
    NEUTRAL_PROFESSIONAL = "Gender neutral professional voice"


# Exact strings accepted by API / sent by the web client (`VOICE_TYPES[].id` in frontend).
VOICE_TYPE_VALUES: frozenset[str] = frozenset(v.value for v in VoiceType)


class DialogueLine(BaseModel):
    speaker: Roles
    text: str
    voice_type: VoiceType


class PodcastScript(BaseModel):
    lines: List[DialogueLine]
    summarized_title: str


def _first_sentence(text: str) -> str:
    """Keep a single sentence for takeaway (first sentence ending in . ! or ?)."""
    s = (text or "").strip()
    if not s:
        return ""
    parts = re.split(r"(?<=[.!?])\s+", s, maxsplit=1)
    first = parts[0].strip() if parts else s
    if not first:
        return s
    if len(first) > 400 and not re.search(r"[.!?]$", first):
        return first[:397].rstrip() + "..."
    return first


_CONCEPT_PAD = "Additional examples and framing are covered in the episode audio."


class CheatSheetContent(BaseModel):
    """Structured cheat sheet for listeners (matches UI: key terms, concepts, takeaway)."""

    key_terms: List[str] = Field(
        ...,
        description="At most 5 short memorable phrases (about 2–4 words each).",
    )
    concepts: List[str] = Field(
        ...,
        description="Exactly 3 complete sentences; each is one key idea (shown as bullet points).",
    )
    takeaway: str = Field(
        ...,
        description="Exactly one sentence: the single clearest insight from the episode.",
    )


class BackdropReelPrompt(BaseModel):
    """Text-to-video prompt for Amazon Nova Reel (TEXT_VIDEO max 512 chars; MULTI_SHOT_AUTOMATED up to 4000)."""

    reel_prompt: str = Field(
        ...,
        description="Ambient scene description; caller truncates to Nova API limit for the chosen task type.",
    )


def clamp_cheat_sheet_content(content: CheatSheetContent) -> CheatSheetContent:
    """Enforce UI rules after Bedrock: ≤5 key terms, exactly 3 concept sentences, one-sentence takeaway."""
    terms = [str(t).strip() for t in content.key_terms if str(t).strip()][:5]
    concepts = [str(c).strip() for c in content.concepts if str(c).strip()][:3]
    while len(concepts) < 3:
        concepts.append(_CONCEPT_PAD)
    takeaway = _first_sentence(content.takeaway)
    if not takeaway:
        takeaway = concepts[0] if concepts else "Listen to the episode for the main ideas."
    return CheatSheetContent.model_construct(
        key_terms=terms or ["Main theme"],
        concepts=concepts[:3],
        takeaway=takeaway,
    )
