import time
import uuid
from typing import Optional, List, Dict, Any, TypedDict, Literal
from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from google.cloud import firestore

# Internal imports 
from app.services.firebase.firebase_admin_setup import admin_db
from app.services.token_verifier import get_current_user
from app.utils.supabase.auth import create_auth_error


# Delete schema
class DeleteChatSchema(BaseModel):
    chatId: str = Field(..., min_length=1)


# Get schemas
class ChatMessage(TypedDict):
    role: Literal['user', 'assistant']
    content: str
    timestamp: int

class ChatData(TypedDict):
    chatId: str
    title: str
    messages: List[ChatMessage]
    contentIdFilter: Optional[str]
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
    role: Literal['user', 'assistant']
    content: str
    timestamp: Optional[int] = None

class SaveChatSchema(BaseModel):
    chatId: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    messages: List[ChatMessageSchema]
    contentIdFilter: Optional[str] = None


router = APIRouter(prefix="/api/user-database/ai-chats", tags=["AI Chats Management"])


# Helper function(s)
def to_millis(dt_obj):
    """Helper to convert Firestore timestamp/datetime to milliseconds."""
    if hasattr(dt_obj, 'timestamp'):
        return int(dt_obj.timestamp() * 1000)
    return int(time.time() * 1000)


@router.delete("/delete")
async def delete_ai_chat(
    payload: DeleteChatSchema, 
    user: Dict[str, Any] = Depends(get_current_user)
):
    try:
        if not user:
            return create_auth_error('Authentication required to delete chats')

        user_id = user.get("id")
        chat_id = payload.chatId

        chat_ref = admin_db.collection('users').document(user_id).collection('ai-chats').document(chat_id)

        chat_doc = chat_ref.get()
        if not chat_doc.exists:
            return JSONResponse(
                status_code=404,
                content={"error": "Chat not found"}
            )

        chat_ref.delete()

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": "Chat deleted successfully",
                "chatId": chat_id
            }
        )

    except Exception as e:
        print(f"[AI_CHATS_DELETE] Error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to delete chat",
                "details": str(e)
            }
        )


@router.get("/get")
async def get_ai_chat(
    chatId: str = Query(..., description="The ID of the chat to retrieve"),
    user: Dict[str, Any] = Depends(get_current_user)
):
    try:
        if not user:
            return create_auth_error('Authentication required to retrieve chat')

        user_id = user.get("id")

        chat_ref = admin_db.collection('users').document(user_id).collection('ai-chats').document(chatId)
        chat_doc = chat_ref.get()

        if not chat_doc.exists:
            return JSONResponse(
                status_code=404,
                content={"error": "Chat not found"}
            )

        data = chat_doc.to_dict()
        if not data:
            return JSONResponse(
                status_code=500,
                content={"error": "Chat data is invalid"}
            )

        messages = data.get('messages') if isinstance(data.get('messages'), list) else []
        
        chat_response: ChatData = {
            "chatId": data.get('chatId') or chat_doc.id,
            "title": data.get('title') or 'Untitled Chat',
            "messages": messages,
            "contentIdFilter": data.get('contentIdFilter'),
            "messageCount": data.get('messageCount') or len(messages),
            "createdAt": to_millis(data.get('createdAt')),
            "updatedAt": to_millis(data.get('updatedAt'))
        }

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": chat_response
            }
        )

    except Exception as e:
        print(f"[AI_CHATS_GET] Error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to retrieve chat",
                "details": str(e)
            }
        )


@router.get("/list")
async def list_ai_chats(user: Dict[str, Any] = Depends(get_current_user)):
    try:
        if not user:
            return create_auth_error('Authentication required to retrieve chats')

        user_id = user.get("id")

        ai_chats_ref = admin_db.collection('users').document(user_id).collection('ai-chats')
        snapshot = ai_chats_ref.order_by('updatedAt', direction='DESCENDING').get()

        if not snapshot:
            return JSONResponse(
                content={
                    "success": True,
                    "chats": [],
                    "count": 0
                }
            )

        # Format chat data
        chats: List[ChatListItem] = []
        
        for doc in snapshot:
            data = doc.to_dict()
            messages = data.get('messages', []) if isinstance(data.get('messages'), list) else []
            
            # Get preview from last message (substring 60)
            preview = 'No messages'
            if len(messages) > 0:
                last_msg = messages[-1]
                content = last_msg.get('content') or 'No content'
                preview = content[:60]
                if len(content) > 60:
                    preview += '...'

            chats.append({
                "chatId": data.get('chatId') or doc.id,
                "title": data.get('title') or 'Untitled Chat',
                "messageCount": data.get('messageCount') or len(messages),
                "createdAt": to_millis(data.get('createdAt')),
                "updatedAt": to_millis(data.get('updatedAt')),
                "preview": preview
            })

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "chats": chats,
                "count": len(chats)
            }
        )

    except Exception as e:
        print(f"[AI_CHATS_LIST] Error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to retrieve chats",
                "details": str(e)
            }
        )
    

@router.post("/save")
async def save_ai_chat(
    payload: SaveChatSchema, 
    user: Dict[str, Any] = Depends(get_current_user)
):
    try:
        if not user:
            return create_auth_error('Authentication required to save chats')

        user_id = user.get("id")

        # Validation: Cannot save empty chat
        if len(payload.messages) == 0:
            return JSONResponse(
                status_code=400,
                content={"error": "Cannot save empty chat"}
            )

        # Reference to user's AI chats collection
        ai_chats_ref = admin_db.collection('users').document(user_id).collection('ai-chats')

        # Prepare chat data
        now_ms = int(time.time() * 1000)
        
        chat_data = {
            "chatId": payload.chatId,
            "title": payload.title,
            "messages": [
                {
                    "role": m.role,
                    "content": m.content,
                    "timestamp": m.timestamp or now_ms
                } for m in payload.messages
            ],
            "contentIdFilter": payload.contentIdFilter or None,
            "messageCount": len(payload.messages),
            "createdAt": firestore.SERVER_TIMESTAMP,
            "updatedAt": firestore.SERVER_TIMESTAMP
        }

        ai_chats_ref.document(payload.chatId).set(chat_data)

        response_data = chat_data.copy()
        response_data["createdAt"] = now_ms
        response_data["updatedAt"] = now_ms

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": "Chat saved successfully",
                "chatId": payload.chatId,
                "data": response_data
            }
        )

    except Exception as e:
        print(f"[AI_CHATS_SAVE] Error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to save chat",
                "details": str(e)
            }
        )
    
