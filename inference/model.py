import io
from omnivoice import OmniVoice
import soundfile as sf
import torch

class VOXXPM2Model:
    def __init__(self):
        self.model = OmniVoice.from_pretrained(
            "k2-fsa/OmniVoice",
            dtype=torch.float16
        )

    def infer(self, text: str, instruction: str) -> bytes:
        with torch.no_grad():
            audio = self.model.generate(
                text=text,
                ref_text=instruction,
            )

            # 🎯 write WAV to memory buffer
            buffer = io.BytesIO()
            sf.write(buffer, audio[0], 24000, format="WAV")

            # move pointer to start
            buffer.seek(0)

            return buffer.read()