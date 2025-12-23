"""
Health Check Routes
API endpoints for health status checks of extraction pipelines
"""

import asyncio
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/health", tags=["health"])


@router.get("/image")
async def check_image_extraction_health():
    """Check health status of the image extraction pipeline"""
    try:
        from app.clients.image_engine import get_image_engine

        def _health_check():
            eng = get_image_engine(yolo_model="yolov8n.pt")
            return {
                "status": "ok",
                "device": eng.device,
                "yolo_model": eng.yolo_model_name,
            }

        status = await asyncio.to_thread(_health_check)

        if status.get("status") == "ok":
            return {"overall_status": "healthy", "details": status}
        else:
            raise HTTPException(
                status_code=503,
                detail={
                    "message": "Image extraction pipeline is not healthy",
                    "details": status,
                },
            )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")


@router.get("/video")
async def check_video_extraction_health():
    """Check health status of the video extraction pipeline"""
    try:
        from app.services.extractors.videos.orchestrator import (
            check_video_pipeline_health,
        )

        health_status = await check_video_pipeline_health()

        if health_status.get("overall_status") == "healthy":
            return health_status
        else:
            raise HTTPException(
                status_code=503,
                detail={
                    "message": "Video extraction pipeline is not healthy",
                    "health_status": health_status,
                },
            )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")


@router.get("/youtube")
async def check_youtube_extraction_health():
    """Check health status of the YouTube extraction pipeline"""
    try:
        from app.services.extractors.youtube import check_youtube_pipeline_health

        health_status = await check_youtube_pipeline_health()

        if health_status.get("overall_status") == "healthy":
            return health_status
        else:
            raise HTTPException(
                status_code=503,
                detail={
                    "message": "YouTube extraction pipeline is not healthy",
                    "health_status": health_status,
                },
            )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")
