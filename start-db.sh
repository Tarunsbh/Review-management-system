#!/bin/bash
# ============================================================
# eGlobe Review Management — Start SQL Server (DB only)
# Run this ONCE before starting the backend locally.
# ============================================================

set -e

echo ""
echo "🚀 Starting SQL Server 2022 via Docker..."
echo ""

# Make sure Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running."
  echo "   → Open Docker Desktop and try again."
  exit 1
fi

# Use docker compose (v2 plugin — works with modern Docker Desktop on Mac)
# Falls back to docker-compose (v1 legacy) if v2 is not available
if docker compose version > /dev/null 2>&1; then
  DOCKER_COMPOSE="docker compose"
else
  DOCKER_COMPOSE="docker-compose"
fi

echo "   Using: $DOCKER_COMPOSE"
echo ""

# Start only the SQL Server container
$DOCKER_COMPOSE up -d sqlserver

echo ""
echo "⏳ Waiting for SQL Server to be ready (this takes ~30 seconds)..."

# Wait until SQL Server accepts connections
# Note: use -C (trust server cert) instead of -No for mssql-tools18 compatibility
attempt=0
max_attempts=30
until docker exec eglobe_mssql /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "eGlobe@StrongPass2024!" \
  -Q "SELECT 1" -C > /dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ $attempt -ge $max_attempts ]; then
    echo ""
    echo "⚠️  SQL Server is taking longer than expected."
    echo "   Wait another 30 seconds and run: npm run db:push && npm run db:init"
    exit 0
  fi
  printf "."
  sleep 3
done

echo ""
echo "✅ SQL Server is ready!"
echo ""

# Create the database if it doesn't exist
docker exec eglobe_mssql /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "eGlobe@StrongPass2024!" -C \
  -Q "IF NOT EXISTS (SELECT 1 FROM sys.databases WHERE name='eglobe_reviews') CREATE DATABASE [eglobe_reviews];" \
  2>/dev/null || true

echo "✅ Database 'eglobe_reviews' ready"
echo ""
echo "────────────────────────────────────────────────────────"
echo "  Next steps — run in the backend folder:"
echo ""
echo "  cd backend"
echo "  npx prisma db push          ← create all tables"
echo "  npm run db:init             ← seed admin user"
echo "  npm run dev                 ← start backend (port 4000)"
echo ""
echo "  Then in a new terminal (frontend folder):"
echo "  cd frontend && npm run dev  ← start frontend (port 3000)"
echo "────────────────────────────────────────────────────────"
echo ""
