from typing import Optional, Dict, Any, TypedDict
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator, AliasChoices

# Internal imports
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
        
        if tag_id:
            # Check if tag exists and belongs to user
            check_res = supabase.table("tags").select("tagid").eq("tagid", tag_id).eq("userid", user_id).execute()
            if not check_res.data:
                return JSONResponse(status_code=404, content={"error": "Tag not found"})

            delete_res = supabase.table("tags").delete().eq("tagid", tag_id).eq("userid", user_id).execute()
            
            return JSONResponse(
                status_code=200, 
                content={"success": True, "tagId": tag_id}
            )
        
        # Handle Bulk Delete
        else:
            # This will trigger cascades for all user's content_tags and tag_stats
            bulk_res = supabase.table("tags").delete().eq("userid", user_id).execute()
            
            count = len(bulk_res.data) if bulk_res.data else 0
            
            return JSONResponse(
                status_code=200, 
                content={"success": True, "count": count}
            )

    except Exception as e:
        print(f"Delete Error: {str(e)}")
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

        # Prepare updates based on schema fields
        update_data = {}
        if payload.tagName is not None:
            update_data["tag_name"] = payload.tagName
            update_data["slug"] = generate_tag_slug(payload.tagName)
        if payload.tagColor is not None:
            update_data["color_code"] = payload.tagColor
        if payload.description is not None:
            update_data["description"] = payload.description

        if not update_data:
            return JSONResponse(status_code=400, content={"error": "No fields provided for update"})

        # Execute update in Supabase
        result = (
            supabase.table("tags")
            .update(update_data)
            .eq("tagid", tag_id)
            .eq("userid", user_id)
            .execute()
        )

        if not result.data:
            return JSONResponse(status_code=404, content={"error": "Tag not found or unauthorized"})

        updated_tag = result.data[0]

        # Fetch current stats to return a complete object to the frontend
        stats_res = (
            supabase.table("tag_stats")
            .select("usage_count")
            .eq("tagid", tag_id)
            .execute()
        )
        usage = stats_res.data[0].get("usage_count", 0) if stats_res.data else 0

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": "Tag updated successfully",
                "data": {
                    "id": updated_tag["tagid"],
                    "tagName": updated_tag["tag_name"],
                    "tagColor": updated_tag["color_code"],
                    "description": updated_tag["description"],
                    "contentCount": usage,
                    "createdAt": updated_tag["created_at"],
                    "updatedAt": updated_tag["updated_at"],
                },
            },
        )

    except Exception as e:
        print(f"Update Error: {str(e)}")
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
