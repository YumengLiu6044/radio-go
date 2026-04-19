import os

from langchain_aws import ChatBedrockConverse
from models import PodcastScript, Roles, VoiceType
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