from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from .database import Base


class UserPlan:
    FREE = "free"
    FAMILY = "family"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    plan = Column(String(20), default=UserPlan.FREE)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    monitored_emails = relationship("MonitoredEmail", back_populates="owner")


class MonitoredEmail(Base):
    __tablename__ = "monitored_emails"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), nullable=False, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_verified = Column(Boolean, default=False)
    verification_token = Column(String(128), nullable=True)
    subscribed_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="monitored_emails")
    breach_events = relationship("BreachEvent", back_populates="monitored_email")


class BreachEvent(Base):
    __tablename__ = "breach_events"

    id = Column(Integer, primary_key=True, index=True)
    monitored_email_id = Column(Integer, ForeignKey("monitored_emails.id"), nullable=False)
    hashed_breach_id = Column(String(64), nullable=False, index=True)  # SHA256(breach_name + breached_on)
    breached_on = Column(DateTime, nullable=False)
    data_classes_count = Column(Integer, nullable=False)  # Anonymized count of data classes
    compromised_passwords = Column(Boolean, default=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    monitored_email = relationship("MonitoredEmail", back_populates="breach_events")
