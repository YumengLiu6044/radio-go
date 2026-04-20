## Inspiration
With the explosion of long-form digital content, people often find it difficult to keep up with their reading lists while on the go. We wanted to bridge the gap between static text and the convenience of audio, creating a seamless way to transform any document—be it a research paper, a news article, or a personal note—into a high-quality, engaging podcast experience.

## What it does
Our application allows users to upload PDF files, paste raw text, or provide a URL through a clean frontend interface. The system then processes this input to generate a natural, conversational script. Finally, it synthesizes that script into a multi-segment podcast, allowing users to listen to their content anytime, anywhere.

## How we built it
We leveraged a robust AWS-native architecture to handle the heavy lifting of generative AI and audio synthesis:

Script Generation: We used Anthropic Claude 3 Haiku via Amazon Bedrock. Haiku provided the perfect balance of speed and intelligence to transform dense input data into a structured podcast script.

Audio Synthesis: The backend runs an infinite loop on Amazon SageMaker, which handles the complex task of processing script segments into high-fidelity audio.

Storage & Delivery: Completed audio segments are aggregated and stored in Amazon S3.

Frontend: The UI fetches the final audio files directly from the S3 bucket, providing a smooth playback experience for the user.

<p align="center">
<img width="500" alt="Radio GO System Architecture" src="https://github.com/user-attachments/assets/71dabe3e-cbda-41c9-bce7-8d1ebf3f9166" />
</p>
## Challenges we ran into
One of the primary hurdles was managing the asynchronous nature of audio generation. Since generating high-quality audio takes longer than generating text, we had to ensure the frontend could efficiently track the progress and retrieve segments as they became available. Additionally, tuning the prompt for Haiku to ensure the script felt "conversational" rather than just a summary required significant iteration.

## Accomplishments that we're proud of
End-to-End Automation: We successfully built a pipeline that moves from raw, unstructured data to a finished audio product with zero manual intervention.

Scalable Architecture: Utilizing SageMaker and Bedrock ensures that the system can scale to handle varying lengths of content without compromising performance.

High-Quality Output: The transition from a simple text summary to a structured "podcast" format makes the information much more digestible.

## What we learned
This project taught us a great deal about orchestrating LLMs and specialized ML instances. We gained deep insights into using Bedrock for rapid text generation and the intricacies of managing persistent compute environments in SageMaker. We also learned the importance of modular file storage in S3 to facilitate fast retrieval for the frontend.

## What's next for Radio-go
We plan to introduce multi-voice synthesis to make the podcasts sound like a real conversation between two hosts. We also want to implement real-time streaming, so users can start listening to the first "chapter" of their podcast while the rest is still being generated in the background.
