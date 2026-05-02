#!/bin/bash
# Railway multi-service setup: Backend API + Frontend static serve + DB/Redis

# Backend (FastAPI)
cd backend
pip install -r requirements.txt
python -c "from app.database import engine; from app import models; models.Base.metadata.create_all(bind=engine)"
uvicorn app.main:app --host 0.0.0.0 --port $PORT --reload &

# Frontend (serve built React)
cd ../frontend
npm ci --only=production
npm run build
npx serve -s dist -l $PORT2 &

# Wait for services
wait

