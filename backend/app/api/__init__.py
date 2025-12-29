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
from .user_database.content.create import router as content_router

__all__ = [
    "extract_router",
    "refine_router",
    "embed_router",
    "health_router",
    "agent_router",
    "chat_router",
    "search_router",
    "auth_router",
    "content_router"
]
