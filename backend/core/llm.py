import os

from langchain_aws import ChatBedrockConverse
from models import (
    BackdropReelPrompt,
    CheatSheetContent,
    PodcastScript,
    Roles,
    VoiceType,
    clamp_cheat_sheet_content,
)
from .aws import AWS_REGION

# Claude 3.5 Sonnet v2 profiles are EOL; use a current model (US inference profile, us-east-1 / us-east-2 / us-west-2).
# Override in `.env` if your account enables a different ID, e.g. `aws bedrock list-inference-profiles --region us-east-1`
# Cheaper alternative: `us.anthropic.claude-haiku-4-5-20251001-v1:0` (enable in Bedrock console first).
BEDROCK_SCRIPT_MODEL = os.getenv(
    "BEDROCK_SCRIPT_MODEL",
    "us.anthropic.claude-sonnet-4-20250514-v1:0",
)

VOICE_INSTRUCTIONS: dict[VoiceType, str] = {
    VoiceType.MALE_DEEP: "Male, deep and slow.",
    VoiceType.MALE_CASUAL: "Male, casual and conversational.",
    VoiceType.FEMALE_SOFT: "Female, soft and relaxed.",
    VoiceType.FEMALE_ENERGETIC: "Female, bright and lively.",
    VoiceType.NEUTRAL_PROFESSIONAL: "Gender-neutral, clear and professional.",
}


def _voice_prompt(v: VoiceType | str) -> str:
    if isinstance(v, str):
        v = VoiceType(v)
    return VOICE_INSTRUCTIONS[v]

podcase_llm = ChatBedrockConverse(
    model=BEDROCK_SCRIPT_MODEL,
    region_name=AWS_REGION,
).with_structured_output(PodcastScript)

cheat_sheet_llm = ChatBedrockConverse(
    model=BEDROCK_SCRIPT_MODEL,
    region_name=AWS_REGION,
).with_structured_output(CheatSheetContent)

backdrop_reel_llm = ChatBedrockConverse(
    model=BEDROCK_SCRIPT_MODEL,
    region_name=AWS_REGION,
).with_structured_output(BackdropReelPrompt)


def estimate_word_count(audio_length_sec: int) -> int:
    # average speaking rate ≈ 150 words/min
    return int((audio_length_sec / 60) * 150)


def generate_tts_script(
    corpus: str,
    audio_length: int,
    voice_type_host: VoiceType,
    voice_type_guest: VoiceType,
    style: str,
    topic: str,
    single: bool = False,
) -> dict[str, object]:
    corpus = corpus[:8000]

    target_words = estimate_word_count(audio_length)

    if single:
        role_description = f"""
        This podcast is a solo narration by a single speaker.
        The speaker should sound natural, engaging, and expressive.
        Give the speaker an American name that matches the voice type.
        The entire script should be delivered as one continuous narration.
        """

        voice_constraints = f"""
        Voice: {_voice_prompt(voice_type_host)}
        """

    else:
        role_description = f"""
        This podcast is a conversation between a Host and an Expert Guest.
        Give both the host and guest American names that match their voice types.
        Ensure they refer to each other by name naturally in conversation.
        """

        voice_constraints = f"""
        Voice for the host: {_voice_prompt(voice_type_host)}
        Voice for the guest: {_voice_prompt(voice_type_guest)}
        """

    system_prompt = f"""
    You are an expert podcast scriptwriter for text-to-speech audio.
    The name of the podcast is "radio.go".

    {role_description}

    Your job:
    - Convert raw text into a natural spoken podcast script
    - Optimize for listening, not reading
    - Summarize a short title for the podcast

    Constraints:
    - Target length: ~{target_words} words
    - {voice_constraints}
    - Style: {style}
    - Topic: {topic}

    Guidelines:
    - Use short, clear sentences
    - Add natural transitions
    - Avoid bullet points
    - Avoid markdown or formatting symbols
    - Spell out abbreviations when needed
    - Make it sound conversational and fluid
    - Add light emphasis using commas and phrasing
    - No stage directions

    """

    human_prompt = f"""
    Use this enriched context:

    {corpus}

    Create the final TTS script.
    """

    response = podcase_llm.invoke([
        ("system", system_prompt),
        ("human", human_prompt),
    ])

    if single:
        for i, line in enumerate(response.lines):
            response.lines[i].speaker = Roles.HOST

    return response.model_dump(mode="json")


def generate_cheat_sheet(script: PodcastScript, title: str = "", topic: str = "") -> dict[str, object]:
    """Summarize a podcast script into key terms, concepts, and a takeaway for the cheat sheet UI."""
    parts: list[str] = []
    for line in script.lines:
        parts.append(f"{line.speaker.value}: {line.text}")
    corpus = "\n\n".join(parts)
    corpus = corpus[:12000]

    display_title = (title or "").strip() or script.summarized_title or "Episode"
    display_topic = (topic or "").strip() or "General"

    system_prompt = """
You create short listener cheat sheets for podcast episodes.
Output plain language only: no markdown, no leading bullets or numbering inside the strings.

Strict shape (the API enforces this; follow it exactly):
- key_terms: at most 5 items. Prefer 3–5 distinct short phrases (about 2–4 words each) a listener should remember.
- concepts: exactly 3 items. Each item is one complete sentence that states one key idea (the app shows them as three bullet points).
- takeaway: exactly one sentence (one main clause ending with . ! or ?) capturing the single clearest insight—do not use a second sentence.
"""

    human_prompt = f"""
Episode title: {display_title}
Topic: {display_topic}

Script:
{corpus}
"""

    response = cheat_sheet_llm.invoke([
        ("system", system_prompt),
        ("human", human_prompt),
    ])
    return clamp_cheat_sheet_content(response).model_dump(mode="json")


def generate_backdrop_reel_prompt(
    script: PodcastScript,
    title: str = "",
    topic: str = "",
    *,
    episode_audio_sec: int = 120,
    reel_render_sec: int = 24,
) -> str:
    """Write a Nova Reel prompt; length cap depends on task (multi-shot allows up to 4000 chars)."""
    parts: list[str] = []
    for line in script.lines:
        parts.append(f"{line.speaker.value}: {line.text}")
    corpus = "\n\n".join(parts)
    corpus = corpus[:6000]

    display_title = (title or "").strip() or script.summarized_title or "Episode"
    display_topic = (topic or "").strip() or "General"
    ep_sec = max(1, int(episode_audio_sec))
    reel_sec = max(12, int(reel_render_sec))
    max_chars = 4000 if reel_sec >= 12 else 512
    ep_min = ep_sec / 60.0

    system_prompt = f"""
You write exactly ONE text-to-video prompt for Amazon Nova Reel.
The clip loops as silent backdrop behind a podcast; the spoken episode is longer than this clip.

Context: the full episode the user picked is about {ep_sec} seconds (~{ep_min:.1f} minutes), but the **video render is only {reel_sec} seconds**—a compact ambient loop, not a summary of the whole show.
Pace visuals for **exactly {reel_sec}s**: one cohesive mood, slow evolution (drift, light, mist, waves), no rushed cuts.

Requirements:
- One coherent ambient world aligned with topic and mood (e.g. golden-hour coast, forest canopy, city bokeh, dunes).
- Slow cinematic motion suited to {reel_sec}s; optional soft mid-clip lighting shift—still one scene family.
- No readable text, logos, subtitles, or UI. No identifiable real people or celebrities. No violence or gore.
- Generic stock-footage tone, safe for a general audience.
- HARD LIMIT: reel_prompt at most {max_chars} characters (Nova API). Plain text only (no markdown).
"""

    human_prompt = f"""
Episode title: {display_title}
Topic: {display_topic}
User episode length (for mood only): {ep_sec} seconds (~{ep_min:.1f} minutes).
Background clip length to generate: {reel_sec} seconds (looping backdrop—optimize pacing for this length only).

Script (for mood and subject only — do not narrate the script literally):
{corpus}
"""

    response = backdrop_reel_llm.invoke(
        [
            ("system", system_prompt),
            ("human", human_prompt),
        ],
    )
    text = (response.reel_prompt or "").strip()
    return text[:max_chars]