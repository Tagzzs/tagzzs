from datetime import datetime, timezone
from typing import Optional, Dict, Any, TypedDict
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator, AliasChoices

# Internal imports
from app.services.firebase.firebase_admin_setup import admin_db
from app.services.firebase.firebase_user_service import FirebaseUserService
from app.api.dependencies import get_current_user
from app.utils.supabase.auth import create_auth_error
from app.utils.supabase.supabase_client import supabase
from app.utils.tag_slugs_generator import generate_tag_slug


class TagsData(TypedDict):
    createdAt: str
    tagName: str
    colorCode: str
    description: str
    contentCount: int
    updatedAt: str


# Add schema
class AddTagSchema(BaseModel):
    tagName: str = Field(..., min_length=1)
    colorCode: str = Field(
        ...,
        validation_alias=AliasChoices("colorCode", "tagColor"),
        pattern=r"^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$",
    )
    description: Optional[str] = ""

    @validator("tagName")
    def name_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("Tag name is required")
        return v.strip()


# Delete schema
class DeleteTagSchema(BaseModel):
    tagId: Optional[str] = None


# Update Schema
class UpdateTagSchema(BaseModel):
    tagId: str = Field(..., min_length=1)  # Required to identify the tag
    tagName: Optional[str] = Field(None, max_length=50)
    tagColor: Optional[str] = Field(None, pattern=r"^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$")
    description: Optional[str] = Field(None, max_length=300)

    @validator("tagName")
    def name_must_not_be_empty(cls, v):
        if v is not None and not v.strip():
            raise ValueError("Tag name cannot be empty")
        return v.strip() if v else v


# Get Schema
class GetTagSchema(BaseModel):
    tagName: Optional[str] = None


router = APIRouter(prefix="/api/user-database/tags", tags=["Tags Management"])


@router.post("/add")
async def add_tag(
    tag_payload: AddTagSchema, user: Dict[str, Any] = Depends(get_current_user)
):
    try:
        if not user:
            return create_auth_error("Authentication required to add tags")

        user_id = user.get("id")

        # Generate Tag ID
        tag_slug = generate_tag_slug(tag_payload.tagName)

        if not tag_slug:
            return JSONResponse(
                status_code=400,
                content={
                    "error": "Invalid tag name - unable to generate valid tag ID",
                    "details": "Tag name contains no valid characters",
                },
            )

        tag_data = {
            "userid": user_id,
            "tag_name": tag_payload.tagName,
            "slug": tag_slug,
            "color_code": tag_payload.colorCode,
            "description": tag_payload.description or ""
        }

        tag_result = supabase.table("tags").insert(tag_data).execute()
        
        if not tag_result.data:
            raise Exception("Failed to insert tag")

        new_tag = tag_result.data[0]
        tag_id = new_tag["tagid"]
        
        return JSONResponse(
            status_code=201,
            content={
                "success": True,
                "data": {
                    "id": tag_id,
                    "tagName": new_tag["tag_name"],
                    "tagColor": new_tag["color_code"],
                    "description": new_tag["description"],
                    "contentCount": 0,
                    "createdAt": new_tag["created_at"],
                    "updatedAt": new_tag["updated_at"],
                },
            },
        )

    except Exception as e:
        print(f"Server Error: {str(e)}")
        return JSONResponse(status_code=500, content={"error": "Internal server error"})


@router.delete("/delete")
async def delete_tags(
    payload: DeleteTagSchema, user: Dict[str, Any] = Depends(get_current_user)
):
    try:
        if not user:
            return create_auth_error("Authentication required to delete tags")

        user_id = user.get("id")
        tag_id = payload.tagId
        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

        if tag_id:
            tag_ref = (
                admin_db.collection("users")
                .document(user_id)
                .collection("tags")
                .document(tag_id)
            )
            if not tag_ref.get().exists:
                return JSONResponse(status_code=404, content={"error": "Tag not found"})

            # Fetch content that uses this tag
            content_collection = (
                admin_db.collection("users").document(user_id).collection("content")
            )
            tagged_content = content_collection.where(
                "tagsId", "array_contains", tag_id
            ).get()

            if len(tagged_content) > 0:
                batch = admin_db.batch()
                for content_doc in tagged_content:
                    tags_list = content_doc.to_dict().get("tagsId", [])
                    updated_tags = [t for t in tags_list if t != tag_id]
                    batch.update(
                        content_doc.reference,
                        {"tagsId": updated_tags, "updatedAt": now},
                    )
                batch.commit()

            tag_ref.delete()

            try:
                FirebaseUserService.update_tags_count(user_id, -1)
            except Exception:
                pass

            return JSONResponse(
                status_code=200, content={"success": True, "tagId": tag_id}
            )

        # Handle Bulk Delete
        else:
            content_collection = (
                admin_db.collection("users").document(user_id).collection("content")
            )
            content_snapshot = content_collection.get()

            if len(content_snapshot) > 0:
                c_batch = admin_db.batch()
                for doc in content_snapshot:
                    c_batch.update(doc.reference, {"tagsId": [], "updatedAt": now})
                c_batch.commit()

            # Batch delete all tags
            tags_ref = admin_db.collection("users").document(user_id).collection("tags")
            tags_snapshot = tags_ref.get()
            t_batch = admin_db.batch()
            for doc in tags_snapshot:
                t_batch.delete(doc.reference)
            t_batch.commit()

            admin_db.collection("users").document(user_id).update(
                {"totalTags": 0, "updatedAt": now}
            )

            return JSONResponse(
                status_code=200, content={"success": True, "count": len(tags_snapshot)}
            )

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.put("/edit")
async def update_tag(
    payload: UpdateTagSchema, user: Dict[str, Any] = Depends(get_current_user)
):
    try:
        if not user:
            return create_auth_error("Authentication required to edit tags")

        user_id = user.get("id")
        tag_id = payload.tagId

        # Check if user exists
        user_ref = admin_db.collection("users").document(user_id)
        if not user_ref.get().exists:
            return JSONResponse(status_code=404, content={"error": "User not found"})

        # Check if tag exists
        tag_ref = user_ref.collection("tags").document(tag_id)
        tag_snapshot = tag_ref.get()
        if not tag_snapshot.exists:
            return JSONResponse(status_code=404, content={"error": "Tag not found"})

        # Calculate current contentCount
        content_collection = user_ref.collection("content")
        content_snapshot = content_collection.where(
            "tagsId", "array_contains", tag_id
        ).get()
        current_content_count = len(content_snapshot)

        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        update_payload: Dict[str, Any] = {
            "contentCount": current_content_count,
            "updatedAt": now,
        }

        if payload.tagName is not None:
            update_payload["tagName"] = payload.tagName
        if payload.tagColor is not None:
            update_payload["colorCode"] = payload.tagColor
        if payload.description is not None:
            update_payload["description"] = payload.description

        # Update and Fetch updated doc
        tag_ref.update(update_payload)
        updated_data = tag_ref.get().to_dict()

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": "Tag updated successfully",
                "updatedFields": [
                    k
                    for k in ["tagName", "tagColor", "description"]
                    if getattr(payload, k) is not None
                ],
                "data": updated_data,
            },
        )

    except Exception as e:
        print(f"Update Error: {str(e)}")
        return JSONResponse(status_code=500, content={"error": "Internal server error"})


@router.get("/edit")
async def get_tag(userId: str, tagId: str):
    try:
        # Validate parameters
        if not userId or not tagId:
            return JSONResponse(
                status_code=400, content={"error": "User ID and Tag ID are required"}
            )

        # Check user existence
        user_ref = admin_db.collection("users").document(userId)
        if not user_ref.get().exists:
            return JSONResponse(status_code=404, content={"error": "User not found"})

        # Get the tag document
        tag_ref = user_ref.collection("tags").document(tagId)
        tag_doc = tag_ref.get()

        if not tag_doc.exists:
            return JSONResponse(status_code=404, content={"error": "Tag not found"})

        # Construct response data (id + data)
        tag_data = {"id": tag_doc.id, **tag_doc.to_dict()}

        return JSONResponse(
            status_code=200, content={"success": True, "data": tag_data}
        )

    except Exception as e:
        print(f"Get Error: {str(e)}")
        return JSONResponse(status_code=500, content={"error": "Internal server error"})


@router.post("/get")
async def get_user_tags(
    payload: GetTagSchema, user: Dict[str, Any] = Depends(get_current_user)
):
    try:
        if not user:
            return create_auth_error("Authentication required to access tags")

        user_id = user.get("id")
        tag_name = payload.tagName

        query = supabase.table("tags").select("*, tag_stats(usage_count)").eq("userid", user_id)

        if tag_name and isinstance(tag_name, str):
            tag_slug = generate_tag_slug(tag_name)
            result = query.eq("slug", tag_slug).execute()

            if not tag_slug:
                return JSONResponse(status_code=200, content={"success": True, "found": False, "message": "Invalid tag name"})
                        
            if not result.data:
                return JSONResponse(status_code=200, content={"success": True, "found": False, "message": "Tag not found"})
            
            tag = result.data[0]
            stats = tag.get("tag_stats", {})
            usage = stats[0].get("usage_count", 0) if isinstance(stats, list) and stats else stats.get("usage_count", 0)

            return JSONResponse(content={
                "success": True,
                "found": True,
                "data": {
                    "id": tag["tagid"],
                    "tagName": tag["tag_name"],
                    "tagColor": tag["color_code"],
                    "description": tag["description"],
                    "contentCount": usage,
                    "createdAt": tag["created_at"],
                    "updatedAt": tag["updated_at"],
                }
            })

        result = query.order("created_at", desc=True).execute()
        all_tags = []

        for tag in result.data:
            stats = tag.get("tag_stats", {})
            if isinstance(stats, list):
                usage = stats[0].get("usage_count", 0) if stats else 0
            else:
                usage = stats.get("usage_count", 0) if stats else 0

            all_tags.append({
                "id": tag["tagid"],
                "tagName": tag["tag_name"],
                "tagColor": tag["color_code"],
                "description": tag["description"],
                "contentCount": usage,
                "createdAt": tag["created_at"],
                "updatedAt": tag["updated_at"],
            })

        return JSONResponse(content={"success": True, "data": all_tags, "count": len(all_tags)})

    except Exception as e:
        print(f"Server Error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "An unexpected error occurred while retrieving tags",
                },
            },
        )
