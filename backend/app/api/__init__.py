"""
API Routes Package

Centralizes all API routers for the Tagzzs backend.
"""

from .extract import router as extract_router
from .refine import router as refine_router
from .embed import router as embed_router
from .health import router as health_router
from .agent import router as agent_router
from .chat import router as chat_router
from .search import router as search_router
from .auth.auth_routes import router as auth_router
from .user_database.content import router as content_router
from .user_database.tags import router as tags_router
from .user_database.profile import router as profile_router
from .user_database.ai_chats import router as ai_chats_router
from .upload import router as upload_router
from .youtube import router as youtube_router
from .extension import router as extension_router
from .audio import router as audio_router

__all__ = [
    "extract_router",
    "refine_router",
    "embed_router",
    "health_router",
    "agent_router",
    "chat_router",
    "search_router",
    "auth_router",
    "content_router",
    "tags_router",
    "profile_router",
    "upload_router",
    "ai_chats_router",
    "youtube_router",
    "extension_router",
    "audio_router",
]
