import time
from typing import Optional, List, Dict, Any, TypedDict, Literal
from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from datetime import datetime

# Internal imports
from app.api.dependencies import get_current_user
from app.utils.supabase.supabase_client import supabase


# Delete schema
class DeleteChatSchema(BaseModel):
    chatId: str = Field(..., min_length=1)


# Get schemas
class ChatMessage(TypedDict):
    id: str  # UUID for frontend tracking
    role: Literal["user", "assistant"]
    content: str
    timestamp: int


class ChatData(TypedDict):
    chatId: str
    title: str
    messages: List[ChatMessage]
    messageCount: int
    createdAt: int
    updatedAt: int


# list schema
class ChatListItem(TypedDict):
    chatId: str
    title: str
    messageCount: int
    createdAt: int
    updatedAt: int
    preview: str


# Save schema
class ChatMessageSchema(BaseModel):
    id: str = Field(..., description="UUID provided by frontend")
    role: Literal["user", "assistant"]
    content: str
    timestamp: Optional[int] = None


class SaveChatSchema(BaseModel):
    chatId: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    messages: List[ChatMessageSchema]


router = APIRouter(prefix="/api/user-database/ai-chats", tags=["AI Chats Management"])


# Helper function(s)
def to_millis(dt_str_or_obj):
    """Helper to convert Supabase timestamp (ISO string) or datetime to milliseconds."""
    if not dt_str_or_obj:
        return int(time.time() * 1000)

    if isinstance(dt_str_or_obj, str):
        try:
            # Handles '2023-10-27T10:00:00+00:00' format
            dt = datetime.fromisoformat(dt_str_or_obj.replace("Z", "+00:00"))
            return int(dt.timestamp() * 1000)
        except ValueError:
            return int(time.time() * 1000)

    if hasattr(dt_str_or_obj, "timestamp"):
        return int(dt_str_or_obj.timestamp() * 1000)

    return int(time.time() * 1000)


@router.delete("/delete")
async def delete_ai_chat(
    chatId: str = Query(..., min_length=1),
    user: Dict[str, Any] = Depends(get_current_user),
):
    try:
        user_id = user.get("id")

        # Check if chat exists and belongs to user
        # DELETE CASCADE on table 'messages' means we only need to delete the conversation
        response = (
            supabase.from_("conversations")
            .delete()
            .eq("conv_id", chatId)
            .eq("userid", user_id)
            .execute()
        )

        # Supabase delete response.data is a list of deleted rows
        if not response.data:
            return JSONResponse(
                status_code=404,
                content={
                    "success": False,
                    "error": {
                        "code": "CHAT_NOT_FOUND",
                        "message": "Chat not found or access denied",
                        "details": f"Chat with ID {chatId} does not exist",
                    },
                },
            )

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": "Chat deleted successfully",
                "chatId": chatId,
            },
        )

    except Exception as e:
        import traceback

        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {
                    "code": "DELETE_FAILED",
                    "message": "Failed to delete chat",
                    "details": str(e),
                },
            },
        )


@router.get("/get")
async def get_ai_chat(
    chatId: str = Query(..., description="The ID of the chat to retrieve"),
    user: Dict[str, Any] = Depends(get_current_user),
):
    try:
        user_id = user.get("id")

        conv_response = (
            supabase.from_("conversations")
            .select("*")
            .eq("conv_id", chatId)
            .eq("userid", user_id)
            .single()
            .execute()
        )

        conversation = conv_response.data
        if not conversation:
            return JSONResponse(
                status_code=404,
                content={
                    "success": False,
                    "error": {
                        "code": "CHAT_NOT_FOUND",
                        "message": "Chat not found",
                        "details": f"Chat with ID {chatId} does not exist",
                    },
                },
            )

        msg_response = (
            supabase.from_("messages")
            .select("*")
            .eq("conv_id", chatId)
            .order("created_at", desc=False)
            .execute()
        )

        db_messages = msg_response.data or []

        formatted_messages: List[ChatMessage] = []
        for msg in db_messages:
            formatted_messages.append(
                {
                    "id": msg.get("msg_id"),
                    "role": msg.get("role"),
                    "content": msg.get("content"),
                    "timestamp": to_millis(msg.get("created_at")),
                }
            )

        chat_response: ChatData = {
            "chatId": conversation.get("conv_id"),
            "title": conversation.get("title") or "Untitled Chat",
            "messages": formatted_messages,
            "messageCount": conversation.get("message_count")
            or len(formatted_messages),
            "createdAt": to_millis(conversation.get("created_at")),
            "updatedAt": to_millis(conversation.get("updated_at")),
        }

        return JSONResponse(
            status_code=200, content={"success": True, "data": chat_response}
        )

    except Exception as e:
        import traceback

        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {
                    "code": "RETRIEVE_FAILED",
                    "message": "Failed to retrieve chat",
                    "details": str(e),
                },
            },
        )


@router.get("/list")
async def list_ai_chats(user: Dict[str, Any] = Depends(get_current_user)):
    try:
        user_id = user.get("id")

        response = (
            supabase.from_("conversations")
            .select("*")
            .eq("userid", user_id)
            .order("updated_at", desc=True)
            .execute()
        )

        conversations = response.data or []

        chats: List[ChatListItem] = []

        for conv in conversations:
            chats.append(
                {
                    "chatId": conv.get("conv_id"),
                    "title": conv.get("title") or "Untitled Chat",
                    "messageCount": conv.get("message_count") or 0,
                    "createdAt": to_millis(conv.get("created_at")),
                    "updatedAt": to_millis(conv.get("updated_at")),
                    "preview": "Open to view messages",  # Placeholder as we don't have last message content in 'conversations'
                }
            )

        return JSONResponse(
            status_code=200,
            content={"success": True, "chats": chats, "count": len(chats)},
        )

    except Exception as e:
        import traceback

        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {
                    "code": "LIST_FAILED",
                    "message": "Failed to retrieve chats",
                    "details": str(e),
                },
            },
        )


@router.post("/save")
async def save_ai_chat(
    payload: SaveChatSchema, user: Dict[str, Any] = Depends(get_current_user)
):
    try:
        user_id = user.get("id")

        if len(payload.messages) == 0:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": {"code": "INVALID_REQUEST", "message": "Empty chat"},
                },
            )

        now_iso = datetime.utcnow().isoformat()

        conv_data = {
            "conv_id": payload.chatId,
            "userid": user_id,
            "title": payload.title,
            "message_count": len(payload.messages),
            "updated_at": now_iso,
        }

        supabase.from_("conversations").upsert(conv_data).execute()

        messages_to_upsert = []

        for m in payload.messages:
            creation_time = now_iso
            if m.timestamp:
                try:
                    creation_time = datetime.fromtimestamp(
                        m.timestamp / 1000.0
                    ).isoformat()
                except (ValueError, OSError, OverflowError):  # Catch specific errors
                    pass

            messages_to_upsert.append(
                {
                    "msg_id": m.id,
                    "conv_id": payload.chatId,
                    "userid": user_id,
                    "role": m.role,
                    "content": m.content,
                    "created_at": creation_time,
                }
            )

        if messages_to_upsert:
            supabase.from_("messages").upsert(messages_to_upsert).execute()

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": "Chat saved successfully",
                "chatId": payload.chatId,
            },
        )

    except Exception as e:
        import traceback

        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {
                    "code": "SAVE_FAILED",
                    "message": "Failed to save chat",
                    "details": str(e),
                },
            },
        )
