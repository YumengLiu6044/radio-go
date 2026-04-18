from langchain_aws import ChatBedrockConverse
from pydantic import BaseModel
from models import PodcastScript

context_llm = ChatBedrockConverse(
    model="global.anthropic.claude-sonnet-4-6",
)
podcase_llm = ChatBedrockConverse(
    model="global.anthropic.claude-sonnet-4-6",
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
