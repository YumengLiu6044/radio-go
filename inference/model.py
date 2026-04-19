import io
import soundfile as sf
from voxcpm import VoxCPM
from pathlib import Path

reference_root = Path("reference_voices")

if not reference_root.exists():
    raise FileNotFoundError("Reference voices not found.")

reference_file_mapping = {
    "Male slow and deep voice": "slow_male.wav",
    "Male casual voice": "male_casual.wav",
    "Soft and relaxed female voice": "female_relaxed.wav",
    "Energetic and expressive female voice": "female_energetic.wav",
    "Gender neutral professional voice": "neutral.wav",
}

class VOXXPM2Model:
    def __init__(self):
        self.model = VoxCPM.from_pretrained(
            "openbmb/VoxCPM2",
            load_denoiser=False,
            optimize=False
        )

    def infer(self, text: str, voice_type: str) -> bytes:
        reference_file = reference_root / reference_file_mapping[voice_type]
        wav = self.model.generate(
            text=text,
            inference_timesteps=10,
            reference_wav_path=reference_file
        )

        sample_rate = self.model.tts_model.sample_rate

        # 🎯 write WAV to memory buffer
        buffer = io.BytesIO()
        sf.write(buffer, wav, sample_rate, format="WAV")

        # move pointer to start
        buffer.seek(0)

        return buffer.read()