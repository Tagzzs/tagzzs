import os
import subprocess
import uuid

BASE_AUDIO_DIR = "data/processed_audio"
os.makedirs(BASE_AUDIO_DIR, exist_ok=True)


def normalize_audio(input_path: str) -> str:
    """
    Converts any audio format to WAV (mono, 16kHz)
    """
    output_filename = f"{uuid.uuid4().hex}.wav"
    output_path = os.path.join(BASE_AUDIO_DIR, output_filename)

    command = [
        "ffmpeg",
        "-y",
        "-i", input_path,
        "-ac", "1",
        "-ar", "16000",
        output_path
    ]

    subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    return output_path
