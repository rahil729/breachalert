import os
from datetime import datetime
from typing import Dict, List, Optional

from redis import Redis
from sqlalchemy.orm import Session

from .. import crud, models
from .hibp_client import HIBPClient
from .notifier import EmailNotifier

SCAN_QUEUE_KEY = "scan_queue"


class ScanEngine:
    def __init__(self, redis_client: Optional[Redis]):
        self.redis = redis_client
        self.hibp = HIBPClient(redis_client) if redis_client else None
        self.notifier = EmailNotifier()

    def enqueue_email(self, monitored_email_id: int) -> None:
        if not self.redis:
            return
        self.redis.lpush(SCAN_QUEUE_KEY, monitored_email_id)

    def process_queue(self, db: Session) -> None:
        while True:
            item = self.redis.rpop(SCAN_QUEUE_KEY)
            if item is None:
                break
            monitored_email_id = int(item)
            monitored_email = db.query(crud.models.MonitoredEmail).filter(crud.models.MonitoredEmail.id == monitored_email_id).first()
            if monitored_email is None or not monitored_email.is_verified:
                continue
            self.scan_email(db, monitored_email)

    def scan_email(self, db: Session, monitored_email) -> List[Dict]:
        breaches = self.hibp.fetch_breaches(monitored_email.email)
        if not breaches:
            return []

        for breach in breaches:
            breach_name = breach.get("Name") or breach.get("name")
            breached_on_str = breach.get("BreachDate")
            if breached_on_str:
                # Handle ISO format with/without Z
                breached_on_str = breached_on_str.replace('Z', '+00:00')
            breached_on = datetime.fromisoformat(breached_on_str) if breached_on_str else datetime.utcnow()
            data_classes = breach.get("DataClasses", [])
            compromised_passwords = any("password" in item.lower() for item in data_classes)
            # raw_details ignored for privacy
            crud.create_breach_event(
                db,
                monitored_email_id=monitored_email.id,
                breach_name=breach_name,
                breached_on=breached_on,
                data_classes=data_classes,  # Pass list for len()
                compromised_passwords=compromised_passwords,
            )
            self.notifier.send_breach_alert(monitored_email.email, breach)

        # Purge expired before returning
        crud.purge_expired_breaches(db)
        return breaches
