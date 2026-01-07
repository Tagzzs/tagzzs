from faster_whisper import WhisperModel
import threading

_model = None
_lock = threading.Lock()


def _load_model():
    global _model
    if _model is None:
        _model = WhisperModel(
            "small",
            device="cpu",
            compute_type="int8"
        )
    return _model


def transcribe(audio_path: str) -> str:
    """
    Transcribes audio file → text
    """
    with _lock:
        model = _load_model()

    segments, _ = model.transcribe(
        audio_path,
        beam_size=5,
        vad_filter=True
    )

    transcript = []
    for segment in segments:
        transcript.append(segment.text.strip())

    return " ".join(transcript)
