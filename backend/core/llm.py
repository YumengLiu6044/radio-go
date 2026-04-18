import os

from langchain_aws import ChatBedrockConverse
from pydantic import BaseModel
from models import PodcastScript

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
) -> dict | BaseModel:
    corpus = corpus[:8000]  # safe chunk size

    # 3. Estimate target length
    target_words = estimate_word_count(audio_length)

    # 4. Prompt engineering
    system_prompt = f"""
    You are an expert podcast scriptwriter for text-to-speech audio. The name of the podcast is "radio.go".
    
    This podcast is a conversation between a Host and an Expert Guest. 
    Name the host and the guest to American names according to their respective voice types.
    Be sure to make the host and the guest refer to each other by their names.
    
    Your job:
    - Convert raw text into a natural podcast interview
    - Format it as a conversation between a Host and an Expert Guest
    - Optimize for spoken audio, not reading

    Constraints:
    - Target length: ~{target_words} words
    - Voice for the host: {voice_type_host}
    - Voice for the guest: {voice_type_guest}
    - Style: {style}
    - Topic: {topic}
    
    Guidelines:
    - Use short, clear sentences
    - Add natural transitions
    - Avoid bullet points
    - Avoid markdown or formatting symbols
    - Spell out abbreviations when needed
    - Make it sound conversational and fluid
    - Add light emphasis cues using commas and pauses
    - No stage directions like [pause], just natural phrasing
    
    Output ONLY the final script.
    """

    enriched_context = enrich_context(corpus, topic)

    human_prompt = f"""
    Use this enriched context:

    {enriched_context}

    Create the final TTS script.
    """

    # 5. Call LLM
    response = podcase_llm.invoke([
        ("system", system_prompt),
        ("human", human_prompt),
    ])

    return response
