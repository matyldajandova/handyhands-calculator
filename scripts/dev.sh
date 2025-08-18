#!/bin/bash

# Smart dev script that finds an available port
# Usage: ./scripts/dev.sh

BASE_PORT=3000
MAX_ATTEMPTS=10

echo "🔍 Looking for available port starting from $BASE_PORT..."

for ((i=0; i<MAX_ATTEMPTS; i++)); do
    PORT=$((BASE_PORT + i))
    
    if ! lsof -i :$PORT > /dev/null 2>&1; then
        echo "✅ Port $PORT is available!"
        echo "🚀 Starting development server on port $PORT..."
        PORT=$PORT npm run dev
        exit 0
    else
        echo "❌ Port $PORT is in use, trying next port..."
    fi
done

echo "❌ Could not find available port after $MAX_ATTEMPTS attempts"
echo "💡 Try killing existing processes with: pkill -f 'next dev'"
exit 1
