"""
Tagzzs Backend - Main Application

FastAPI application with modular route structure.
"""

from app.config import load_environment

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import routers
from app.api import (
    extract_router,
    refine_router,
    embed_router,
    health_router,
    agent_router,
    chat_router,
    search_router,
    auth_router,
    content_router,
    tags_router,
    profile_router,
    upload_router,
    ai_chats_router,
    youtube_router,
)

load_environment()

app = FastAPI(title="Tagzzs Backend", version="1.0.0")

# Configure CORS
allowed_origins = [
    "http://localhost:3000",
    "https://app.tagzzs.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    max_age=3600,
)

# Register routers
app.include_router(extract_router)
app.include_router(refine_router)
app.include_router(embed_router)
app.include_router(health_router)
app.include_router(agent_router)
app.include_router(chat_router)
app.include_router(search_router)
app.include_router(auth_router)
app.include_router(content_router)
app.include_router(tags_router)
app.include_router(profile_router)
app.include_router(upload_router)
app.include_router(ai_chats_router)
app.include_router(youtube_router)


@app.get("/")
def read_root():
    return {"message": "Tagzzs Backend API", "status": "running"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
