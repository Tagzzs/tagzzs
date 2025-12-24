# =============================================================================
# Tagzzs - Development Dockerfile
# =============================================================================
# Runs both Next.js frontend and FastAPI backend for local development.
# Supports CPU and GPU modes via docker-compose profiles.
#
# Usage:
#   CPU:  docker compose up -d
#   GPU:  docker compose --profile gpu up -d
#
# License: Apache-2.0
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Frontend Dependencies
# -----------------------------------------------------------------------------
FROM node:20-alpine AS frontend-deps

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

# -----------------------------------------------------------------------------
# Stage 2: CPU Runtime
# -----------------------------------------------------------------------------
FROM python:3.13-slim-bookworm AS production-cpu

LABEL org.opencontainers.image.title="Tagzzs"
LABEL org.opencontainers.image.description="AI-Powered Second Brain - Development"
LABEL org.opencontainers.image.source="https://github.com/Tagzzs/tagzzs"
LABEL org.opencontainers.image.licenses="Apache-2.0"

WORKDIR /app

# Install System Dependencies + Node.js
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ffmpeg \
    tesseract-ocr \
    build-essential \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Python Dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy Backend Source
COPY backend/app ./backend/app

# Copy Frontend Dependencies and Source
COPY --from=frontend-deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY next.config.mjs tsconfig.json ./
COPY tailwind.config.ts postcss.config.mjs ./
COPY components.json ./
COPY src ./src
COPY public ./public

# Copy Entrypoint
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Environment
ENV NODE_ENV=development \
    PYTHONUNBUFFERED=1 \
    DEVICE_TYPE=cpu

EXPOSE 3000 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
    CMD curl -f http://localhost:3000 && curl -f http://localhost:8000/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]

# -----------------------------------------------------------------------------
# Stage 3: GPU Runtime (NVIDIA CUDA)
# -----------------------------------------------------------------------------
FROM nvidia/cuda:12.1.1-runtime-ubuntu22.04 AS production-gpu

LABEL org.opencontainers.image.title="Tagzzs"
LABEL org.opencontainers.image.description="AI-Powered Second Brain - GPU Development"
LABEL org.opencontainers.image.source="https://github.com/Tagzzs/tagzzs"
LABEL org.opencontainers.image.licenses="Apache-2.0"

WORKDIR /app

# Install Python, Node.js, and System Dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 \
    python3-pip \
    python3.11-dev \
    curl \
    ffmpeg \
    tesseract-ocr \
    build-essential \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/bin/python3.11 /usr/bin/python \
    && ln -sf /usr/bin/pip3 /usr/bin/pip

# Install Python Dependencies with CUDA Support
COPY backend/requirements.txt ./backend/
RUN python -m pip install --no-cache-dir --upgrade pip && \
    python -m pip install --no-cache-dir torch torchvision torchaudio \
    --index-url https://download.pytorch.org/whl/cu121 && \
    python -m pip install --no-cache-dir -r backend/requirements.txt

# Copy Backend Source
COPY backend/app ./backend/app

# Copy Frontend Dependencies and Source
COPY --from=frontend-deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY next.config.mjs tsconfig.json ./
COPY tailwind.config.ts postcss.config.mjs ./
COPY components.json ./
COPY src ./src
COPY public ./public

# Copy Entrypoint
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Environment
ENV NODE_ENV=development \
    PYTHONUNBUFFERED=1 \
    DEVICE_TYPE=cuda \
    NVIDIA_VISIBLE_DEVICES=all \
    NVIDIA_DRIVER_CAPABILITIES=compute,utility

EXPOSE 3000 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
    CMD curl -f http://localhost:3000 && curl -f http://localhost:8000/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]
