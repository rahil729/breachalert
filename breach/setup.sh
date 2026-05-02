#!/bin/sh
set -e

echo "Setting up BreachAlert for production..."

# Backend setup
cd backend
pip install -r requirements.txt
alembic upgrade head  # if using migrations

# Frontend build
cd ../frontend
npm ci --only=production
npm run build

# Create symlinks or adjust paths if needed
echo "Setup complete. Railway will handle services."

