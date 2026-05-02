from datetime import datetime
from typing import List, Optional

from sqlalchemy.orm import Session

from . import models, schemas


def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.email == email).first()


def create_user(db: Session, user: schemas.UserCreate) -> models.User:
    db_user = models.User(
        email=user.email,
        hashed_password=user.password,
        full_name=user.full_name,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_monitored_emails(db: Session, user_id: int) -> List[models.MonitoredEmail]:
    return db.query(models.MonitoredEmail).filter(models.MonitoredEmail.owner_id == user_id).all()


def get_monitored_email(db: Session, email_id: int, owner_id: int) -> Optional[models.MonitoredEmail]:
    return (
        db.query(models.MonitoredEmail)
        .filter(models.MonitoredEmail.id == email_id, models.MonitoredEmail.owner_id == owner_id)
        .first()
    )


def create_monitored_email(db: Session, owner_id: int, email: str, token: str) -> models.MonitoredEmail:
    monitored_email = models.MonitoredEmail(
        email=email,
        owner_id=owner_id,
        verification_token=token,
        is_verified=False,
        subscribed_at=datetime.utcnow(),
    )
    db.add(monitored_email)
    db.commit()
    db.refresh(monitored_email)
    return monitored_email


def mark_email_verified(db: Session, monitored_email: models.MonitoredEmail) -> models.MonitoredEmail:
    monitored_email.is_verified = True
    monitored_email.verification_token = None
    db.commit()
    db.refresh(monitored_email)
    return monitored_email


import hashlib
from datetime import datetime, timedelta

def create_breach_event(db: Session, monitored_email_id: int, breach_name: str, breached_on: datetime, data_classes: List[str], compromised_passwords: bool, raw_details: str = "") -> models.BreachEvent:
    # Privacy: Hash breach identifier
    breach_hash_input = f"{breach_name}:{breached_on.isoformat()}"
    hashed_breach_id = hashlib.sha256(breach_hash_input.encode()).hexdigest()
    data_classes_count = len(data_classes)
    expires_at = datetime.utcnow() + timedelta(days=90)
    
    event = models.BreachEvent(
        monitored_email_id=monitored_email_id,
        hashed_breach_id=hashed_breach_id,
        breached_on=breached_on,
        data_classes_count=data_classes_count,
        compromised_passwords=compromised_passwords,
        expires_at=expires_at,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event

def purge_expired_breaches(db: Session) -> int:
    expired_count = db.query(models.BreachEvent).filter(models.BreachEvent.expires_at < datetime.utcnow()).delete()
    db.commit()
    return expired_count


def get_breach_events(db: Session, monitored_email_id: int) -> List[models.BreachEvent]:
    return (
        db.query(models.BreachEvent)
        .filter(models.BreachEvent.monitored_email_id == monitored_email_id)
        .order_by(models.BreachEvent.breached_on.desc())
        .all()
    )
