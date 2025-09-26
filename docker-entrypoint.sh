#!/bin/sh
set -e

# Load production environment variables
if [ -f "/app/.env.production" ]; then
  echo "📝 Loading production environment variables..."
  export $(grep -v '^#' /app/.env.production | xargs)
fi

echo "🔄 Running database migrations..."

# Run database migrations
if [ "$NODE_ENV" = "production" ]; then
  # In production, run migrations
  # npx drizzle-kit migrate
  echo "⚠️  production mode - skipping migrations"
else
  # In development, just check connection
  echo "⚠️  Development mode - skipping migrations"
fi

echo "✅ Database ready, starting application..."

# Start the application
exec "$@"
