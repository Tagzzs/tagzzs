import tempfile
import os
import uuid
from pydub import AudioSegment

from .whisper import transcribe
from .converter import normalize_audio

RAW_AUDIO_DIR = "data/raw_audio"
os.makedirs(RAW_AUDIO_DIR, exist_ok=True)


class AudioStreamBuffer:
    """
    Buffers raw audio chunks and produces transcription with metadata
    """

    def __init__(self):
        self.temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
        self.chunks = []

    def write(self, chunk: bytes):
        self.temp_file.write(chunk)
        self.chunks.append(chunk)

    def finalize(self) -> dict:
        self.temp_file.close()

        # Get metadata from raw data
        raw_data = b''.join(self.chunks)
        
        # Save the streamed audio file permanently
        unique_filename = f"{uuid.uuid4().hex}.wav"
        saved_file_path = os.path.join(RAW_AUDIO_DIR, unique_filename)
        with open(saved_file_path, "wb") as f:
            f.write(raw_data)
        
        try:
            audio = AudioSegment.from_file(saved_file_path)
            metadata = {
                "duration_seconds": len(audio) / 1000,
                "channels": audio.channels,
                "frame_rate": audio.frame_rate,
                "sample_width": audio.sample_width,
                "file_size_bytes": len(raw_data),
            }
        except Exception:
            metadata = {"error": "Could not extract metadata"}

        normalized = normalize_audio(saved_file_path)
        text = transcribe(normalized)

        os.unlink(self.temp_file.name)
        os.unlink(normalized)

        return {
            "transcript": text,
            "metadata": metadata,
            "saved_file_path": saved_file_path,
            "file_id": unique_filename,
        }
