from fastapi import APIRouter, UploadFile, File, Depends

from services.extractors.audio import extract_audio
from app.services.refiners.summarizers import summarize_content
from app.services.refiners.tag_generators import generate_tags
from app.api.dependencies import verify_token

router = APIRouter()


@router.post("/upload")
async def upload_audio(
    file: UploadFile = File(...),
    user=Depends(verify_token)
):
    """
    Upload audio file and generate tags
    """
    result = extract_audio(file)
    transcript = result["transcript"]
    metadata = result["metadata"]

    # Generate detailed description (summary)
    summary_response = await summarize_content(transcript, max_length=200, min_length=50)
    description = summary_response.summary if summary_response.success else transcript[:200]

    # Generate tags based on description
    tags_response = await generate_tags(description, top_k=10, user_id=user["uid"])
    tags = [tag.name for tag in tags_response.tags] if tags_response.success else []

    return {
        "source": "audio",
        "transcript": transcript,
        "metadata": metadata,
        "description": description,
        "tags": tags
    }
