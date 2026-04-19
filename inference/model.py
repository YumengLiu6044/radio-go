import torch
import io
import soundfile as sf
from voxcpm import VoxCPM

class VOXXPM2Model:
    def __init__(self):
        self.model = VoxCPM.from_pretrained(
            "openbmb/VoxCPM2",
            load_denoiser=False,
        )

    def infer(self, text: str) -> bytes:
        with torch.no_grad():
            wav = self.model.generate(
                text=text,
                inference_timesteps=10,
            )

            sample_rate = self.model.tts_model.sample_rate

            # 🎯 write WAV to memory buffer
            buffer = io.BytesIO()
            sf.write(buffer, wav, sample_rate, format="WAV")

            # move pointer to start
            buffer.seek(0)

            return buffer.read()