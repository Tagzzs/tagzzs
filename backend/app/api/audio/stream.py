from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from services.extractors.audio.stream import AudioStreamBuffer
from app.services.refiners.summarizers import summarize_content
from app.services.refiners.tag_generators import generate_tags

router = APIRouter()


@router.websocket("/stream")
async def audio_stream(ws: WebSocket):
    await ws.accept()
    buffer = AudioStreamBuffer()

    try:
        while True:
            data = await ws.receive_bytes()
            buffer.write(data)

    except WebSocketDisconnect:
        result = buffer.finalize()
        transcript = result["transcript"]
        metadata = result["metadata"]

        # Generate detailed description
        summary_response = await summarize_content(transcript, max_length=200, min_length=50)
        description = summary_response.summary if summary_response.success else transcript[:200]

        # Generate tags
        tags_response = await generate_tags(description, top_k=10)
        tags = [tag.name for tag in tags_response.tags] if tags_response.success else []

        await ws.send_json({
            "event": "final",
            "transcript": transcript,
            "metadata": metadata,
            "description": description,
            "tags": tags
        })
