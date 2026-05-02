from redis import Redis
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.services.scan_engine import ScanEngine


def run_scan():
    redis_client = Redis.from_url("redis://localhost:6379/0", decode_responses=True)
    engine = ScanEngine(redis_client)
    db: Session = SessionLocal()
    try:
        engine.process_queue(db)
    finally:
        db.close()


if __name__ == "__main__":
    run_scan()
