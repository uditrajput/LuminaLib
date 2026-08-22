#!/usr/bin/env bash
set -e

# ───────────────────────────────────────────────────────────────────────────────
# LuminaLib – Single Command Build & Deploy Script (Bash)
# Usage: ./deploy.sh [--rebuild] [--down] [--logs]
# ───────────────────────────────────────────────────────────────────────────────

COMPOSE_CMD="docker-compose"
if ! command -v docker-compose &> /dev/null; then
    if docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        echo "❌ Error: Neither docker-compose nor 'docker compose' plugin was found."
        exit 1
    fi
fi

if [ "$1" == "--down" ]; then
    echo "🛑 Stopping all LuminaLib containers..."
    $COMPOSE_CMD down
    echo "✅ Containers stopped."
    exit 0
fi

if [ "$1" == "--logs" ]; then
    $COMPOSE_CMD logs -f
    exit 0
fi

REBUILD_FLAG=""
if [ "$1" == "--rebuild" ]; then
    REBUILD_FLAG="--no-cache"
    echo "⚙️ Forcing fresh image rebuild (--no-cache)..."
fi

echo "🚀 Building and deploying LuminaLib stack in a single command..."
$COMPOSE_CMD up --build -d $REBUILD_FLAG

echo ""
echo "✅ All LuminaLib microservices deployed successfully!"
echo "   - Frontend UI:     http://localhost:3000"
echo "   - Backend API:     http://localhost:8000/api/v1"
echo "   - Swagger Docs:    http://localhost:8000/docs"
echo "   - Voice WS:        ws://localhost:8001/voice/ws"
echo "   - Grafana:         http://localhost:3001 or http://localhost:3000/grafana"
echo ""
