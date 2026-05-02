import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from redis import Redis

from . import models
from .api.routes import router
from .database import engine
from .services.scan_engine import ScanEngine

app = FastAPI(title="BreachAlert API")
app.include_router(router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("FRONTEND_URL", "http://localhost:5173"),
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

models.Base.metadata.create_all(bind=engine)

# Try to connect to Redis, but make it optional
try:
    redis_client = Redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"), decode_responses=True)
    redis_client.ping()
except Exception as e:
    print(f"Warning: Redis not available ({e}). Running without Redis.")
    redis_client = None

scan_engine = ScanEngine(redis_client) if redis_client else None


def nightly_scan() -> None:
    if not scan_engine:
        return
    from .database import SessionLocal
    db = SessionLocal()
    try:
        scan_engine.process_queue(db)
    finally:
        db.close()


scheduler = BackgroundScheduler(timezone="UTC")
if scan_engine:
    scheduler.add_job(nightly_scan, "cron", hour=2, minute=0)
    scheduler.start()


@app.get("/")
def health_check():
    return {"message": "BreachAlert is running."}
