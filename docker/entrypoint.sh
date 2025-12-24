#!/bin/bash
# =============================================================================
# Tagzzs - Entrypoint Script
# Starts both frontend and backend for local development
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }

# GPU Detection
detect_gpu() {
    if command -v nvidia-smi &> /dev/null && nvidia-smi &> /dev/null; then
        log_success "NVIDIA GPU detected"
        nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
        export DEVICE_TYPE="cuda"
    else
        log_info "No GPU detected, using CPU"
        export DEVICE_TYPE="${DEVICE_TYPE:-cpu}"
    fi
}

# Graceful Shutdown
BACKEND_PID=""
FRONTEND_PID=""

shutdown() {
    log_info "Shutting down..."
    [ -n "$BACKEND_PID" ] && kill -TERM "$BACKEND_PID" 2>/dev/null
    [ -n "$FRONTEND_PID" ] && kill -TERM "$FRONTEND_PID" 2>/dev/null
    exit 0
}
trap shutdown SIGTERM SIGINT

# Main
echo ""
echo "============================================"
echo "         🏷️  Tagzzs Development"
echo "============================================"
echo ""

detect_gpu
echo ""

# Start Backend (from backend directory so imports work)
log_info "Starting FastAPI backend on :8000..."
cd /app/backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
sleep 3

# Start Frontend (from app directory)
log_info "Starting Next.js frontend on :3000..."
cd /app
npm run dev &
FRONTEND_PID=$!

echo ""
echo "============================================"
echo "  🚀 Tagzzs is running!"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
echo "  Device:   ${DEVICE_TYPE}"
echo "============================================"
echo ""

# Monitor
while kill -0 "$BACKEND_PID" 2>/dev/null && kill -0 "$FRONTEND_PID" 2>/dev/null; do
    sleep 5
done

log_error "A process died unexpectedly"
shutdown
