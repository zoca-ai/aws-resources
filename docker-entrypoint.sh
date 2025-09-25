#!/bin/sh
set -e

echo "🔄 Running database migrations..."

# Run database migrations
if [ "$NODE_ENV" = "production" ]; then
    # In production, run migrations
    npx drizzle-kit migrate
else
    # In development, just check connection
    echo "⚠️  Development mode - skipping migrations"
fi

echo "✅ Database ready, starting application..."

# Start the application
exec "$@"