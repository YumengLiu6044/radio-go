from langchain_aws import ChatBedrockConverse
from models import PodcastScript

context_llm = ChatBedrockConverse(
    model="global.anthropic.claude-sonnet-4-6",
)
podcase_llm = ChatBedrockConverse(
    model="global.anthropic.claude-sonnet-4-6",
).with_structured_output(PodcastScript)
