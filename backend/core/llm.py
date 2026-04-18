import os

from langchain_aws import ChatBedrockConverse
from pydantic import BaseModel
from models import PodcastScript, Roles

# Prefer AWS_DEFAULT_REGION (boto3 default); fall back to AWS_REGION from .env
_BEDROCK_REGION = (
    (os.getenv("AWS_DEFAULT_REGION") or os.getenv("AWS_REGION") or "").strip()
    or "us-east-1"
)

context_llm = ChatBedrockConverse(
    model="global.anthropic.claude-sonnet-4-6",
    region_name=_BEDROCK_REGION,
)
podcase_llm = ChatBedrockConverse(
    model="global.anthropic.claude-sonnet-4-6",
    region_name=_BEDROCK_REGION,
).with_structured_output(PodcastScript)


def estimate_word_count(audio_length_sec: int) -> int:
    # average speaking rate ≈ 150 words/min
    return int((audio_length_sec / 60) * 150)


def enrich_context(corpus: str, topic: str) -> str:
    system_prompt = f"""
    You are an expert researcher.
    
    Your job:
    - Extract the most important ideas from the text
    - Add missing background context
    - Clarify complex concepts
    - Keep it concise but informative
    
    Focus on:
    - Key concepts
    - Important facts
    - Definitions
    - Implicit assumptions
    - Useful examples
    
    Topic: {topic}
    
    Output format:
    - Clear paragraphs
    - No bullet points
    - No fluff
    """

    human_prompt = f"""
    Text:
    {corpus}
    
    Produce enriched context.
    """

    response = context_llm.invoke([
        ("system", system_prompt),
        ("human", human_prompt),
    ])

    return response.content.strip()

def generate_tts_script(
    corpus: str,
    audio_length: int,
    voice_type_host: str,
    voice_type_guest: str,
    style: str,
    topic: str,
    single: bool = False,
) -> dict:
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
        Voice: {voice_type_host}
        """

    else:
        role_description = f"""
        This podcast is a conversation between a Host and an Expert Guest.
        Give both the host and guest American names that match their voice types.
        Ensure they refer to each other by name naturally in conversation.
        """

        voice_constraints = f"""
        Voice for the host: {voice_type_host}
        Voice for the guest: {voice_type_guest}
        """

    system_prompt = f"""
    You are an expert podcast scriptwriter for text-to-speech audio.
    The name of the podcast is "radio.go".

    {role_description}

    Your job:
    - Convert raw text into a natural spoken podcast script
    - Optimize for listening, not reading

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

    enriched_context = enrich_context(corpus, topic)

    human_prompt = f"""
    Use this enriched context:

    {enriched_context}

    Create the final TTS script.
    """

    response = podcase_llm.invoke([
        ("system", system_prompt),
        ("human", human_prompt),
    ])

    if single:
        for i, line in enumerate(response.lines):
            response.lines[i].speaker = Roles.HOST

    return response