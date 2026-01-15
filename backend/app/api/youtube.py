import time
import uuid
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.api.dependencies import get_current_user
from app.utils.supabase.supabase_client import supabase

router = APIRouter(prefix="/youtube", tags=["YouTube Extraction"])

# --- Models ---

class QueueRequest(BaseModel):
    url: str

class QueueResponse(BaseModel):
    success: bool = True
    message: str
    requestId: str
    status: str

class ExtractionResultData(BaseModel):
    metadata: Optional[Dict[str, Any]] = None
    content: Optional[Dict[str, Any]] = None

class ResultResponse(BaseModel):
    success: bool
    status: str
    videoUrl: str
    createdAt: str
    data: Optional[ExtractionResultData] = None
    error: Optional[str] = None

class QueueItem(BaseModel):
    id: str
    status: str
    videoUrl: str
    createdAt: str
    thumbnailUrl: Optional[str] = None
    title: Optional[str] = None

class ListResponse(BaseModel):
    success: bool
    drafts: List[QueueItem]

# --- Helper Functions ---

def is_youtube_url(url: str) -> bool:
    youtube_domains = ["youtube.com", "youtu.be", "m.youtube.com", "www.youtube.com"]
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        return any(domain in parsed.netloc for domain in youtube_domains)
    except:
        return False

# --- Endpoints ---

@router.post("/queue", response_model=QueueResponse)
async def queue_youtube_extraction(
    body: QueueRequest,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Queue a YouTube URL for background extraction.
    """
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
        
    user_id = user["id"]
    url = body.url.strip()

    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

    if not is_youtube_url(url):
        raise HTTPException(status_code=400, detail="Invalid YouTube URL")

    # Generate Request ID as proper UUID
    request_id = str(uuid.uuid4())

    try:
        # Insert into Supabase
        data = {
            "id": request_id,
            "video_url": url,
            "user_id": user_id,
            "status": "pending",
            "created_at": datetime.utcnow().isoformat()
        }
        
        # Using service role client (global 'supabase' var from utils)
        # Verify it works securely: we set user_id manually valid from token
        res = supabase.table("extraction_queue").insert(data).execute()
        
        return {
            "success": True,
            "message": "YouTube extraction queued successfully",
            "requestId": request_id,
            "status": "pending"
        }

    except Exception as e:
        print(f"Error queueing YouTube extraction: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to queue extraction: {str(e)}")


@router.get("/result", response_model=ResultResponse)
async def get_extraction_result(
    id: str = Query(..., description="The Request ID"),
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get the status and result of a queued extraction.
    """
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
        
    user_id = user["id"]

    try:
        # 1. Check status in queue
        queue_res = supabase.table("extraction_queue") \
            .select("status, video_url, created_at") \
            .eq("id", id) \
            .eq("user_id", user_id) \
            .execute()

        if not queue_res.data:
            raise HTTPException(status_code=404, detail="Extraction request not found")
        
        queue_item = queue_res.data[0]
        status = queue_item["status"]
        
        response = {
            "success": True,
            "status": status,
            "videoUrl": queue_item["video_url"],
            "createdAt": queue_item["created_at"],
            "data": None,
            "error": None
        }

        # 2. If completed, fetch results
        if status == "completed":
            result_res = supabase.table("extraction_results") \
                .select("data, error_message") \
                .eq("queue_id", id) \
                .execute()
                
            if result_res.data:
                result_item = result_res.data[0]
                response["data"] = result_item["data"]
                # If there was a soft error in data
                if result_item.get("error_message"):
                     response["error"] = result_item["error_message"]
            else:
                 # Should not happen if status is completed
                 response["error"] = "Result data missing"

        elif status == "failed":
            # fetch error message if available
            result_res = supabase.table("extraction_results") \
                .select("error_message") \
                .eq("queue_id", id) \
                .execute()
            if result_res.data:
                 response["error"] = result_res.data[0].get("error_message", "Extraction failed")
            else:
                 response["error"] = "Extraction failed"

        return response

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching result: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch result: {str(e)}")


@router.get("/list", response_model=ListResponse)
async def list_youtube_queue(
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    List recent extraction requests for the user.
    """
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    user_id = user["id"]
    
    try:
        # Auto-cleanup older than 7 days
        try:
            seven_days_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
            
            # 1. Find old IDs
            old_items = supabase.table("extraction_queue") \
                .select("id") \
                .eq("user_id", user_id) \
                .lt("created_at", seven_days_ago) \
                .execute()
                
            if old_items.data:
                old_ids = [item['id'] for item in old_items.data]
                if old_ids:
                    # 2. Delete from results first (manually cascading)
                    supabase.table("extraction_results") \
                        .delete() \
                        .in_("queue_id", old_ids) \
                        .execute()
                        
                    # 3. Delete from queue
                    supabase.table("extraction_queue") \
                        .delete() \
                        .in_("id", old_ids) \
                        .execute()
                    print(f"Cleaned up {len(old_ids)} expired drafts")
        except Exception as cleanup_error:
            print(f"Cleanup error (non-fatal): {cleanup_error}")

        # Fetch recent items
        # Join with extraction_results to get simplified metadata for the list
        # Supabase-py syntax for join: table(col, foreign_table(col))
        
        query = "id, status, video_url, created_at, extraction_results(data)"
        
        res = supabase.table("extraction_queue") \
            .select(query) \
            .eq("user_id", user_id) \
            .order("created_at", desc=True) \
            .limit(50) \
            .execute()
        
        drafts = []
        for item in res.data:
            draft = {
                "id": item["id"],
                "status": item["status"],
                "videoUrl": item["video_url"],
                "createdAt": item["created_at"],
                "thumbnailUrl": None,
                "title": None
            }
            
            # Extract metadata from joined result if available
            results = item.get("extraction_results")
            if results:
                result_data = results[0] if isinstance(results, list) and len(results) > 0 else (results if isinstance(results, dict) else None)
                
                if result_data and result_data.get("data"):
                    data = result_data["data"]
                    # Try to find thumbnail
                    if data.get("metadata") and data["metadata"].get("thumbnailUrl"):
                        draft["thumbnailUrl"] = data["metadata"]["thumbnailUrl"]
                    
                    # Try to find title
                    if data.get("content") and data["content"].get("title"):
                        draft["title"] = data["content"]["title"]
            
            drafts.append(draft)
            
        return {
            "success": True,
            "drafts": drafts
        }

    except Exception as e:
        print(f"Error listing drafts: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list drafts: {str(e)}")