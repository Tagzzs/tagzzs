import os
import uuid
from fastapi import UploadFile
from pydub import AudioSegment

from .converter import normalize_audio
from .whisper import transcribe

RAW_AUDIO_DIR = "data/raw_audio"
PROCESSED_AUDIO_DIR = "data/processed_audio"
os.makedirs(RAW_AUDIO_DIR, exist_ok=True)
os.makedirs(PROCESSED_AUDIO_DIR, exist_ok=True)


def get_audio_metadata(file_path: str) -> dict:
    """
    Extract metadata from audio file
    """
    audio = AudioSegment.from_file(file_path)
    return {
        "duration_seconds": len(audio) / 1000,
        "channels": audio.channels,
        "frame_rate": audio.frame_rate,
        "sample_width": audio.sample_width,
        "file_size_bytes": os.path.getsize(file_path),
    }


def extract_audio(file: UploadFile) -> dict:
    """
    Audio → Text extractor with metadata and file saving
    (used by Tagzzs pipeline)
    """
    # Generate unique filename
    file_extension = file.filename.split(".")[-1] if "." in file.filename else "wav"
    unique_filename = f"{uuid.uuid4().hex}.{file_extension}"
    
    # Save original file permanently
    saved_file_path = os.path.join(RAW_AUDIO_DIR, unique_filename)
    with open(saved_file_path, "wb") as f:
        f.write(file.file.read())

    metadata = get_audio_metadata(saved_file_path)
    wav_path = normalize_audio(saved_file_path)
    transcript = transcribe(wav_path)

    # Clean up temporary WAV file only
    os.unlink(wav_path)

    return {
        "transcript": transcript,
        "metadata": metadata,
        "saved_file_path": saved_file_path,
        "file_id": unique_filename,
    }
