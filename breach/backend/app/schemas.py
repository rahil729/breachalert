from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenPayload(BaseModel):
    sub: Optional[str] = None


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    phone: Optional[str] = None
    plan: str = "free"


class UserCreate(UserBase):
    password: str


class UserRead(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        orm_mode = True


class MonitoredEmailBase(BaseModel):
    email: EmailStr


class MonitoredEmailCreate(MonitoredEmailBase):
    pass


class MonitoredEmailRead(MonitoredEmailBase):
    id: int
    owner_id: int
    is_verified: bool
    subscribed_at: datetime

    class Config:
        orm_mode = True


class BreachEventRead(BaseModel):
    id: int
    monitored_email_id: int
    hashed_breach_id: str
    breached_on: datetime
    data_classes_count: int
    compromised_passwords: bool
    expires_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class EmailVerifyRequest(BaseModel):
    email: EmailStr
    token: str


class VerificationResponse(BaseModel):
    success: bool
    message: str


class PlanUpgrade(BaseModel):
    plan: str
