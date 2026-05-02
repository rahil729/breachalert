from datetime import timedelta
import uuid
import asyncio

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from .. import auth, crud, models, schemas
from ..database import get_db
from ..services.notifier import EmailNotifier
from ..services.scan_engine import ScanEngine

router = APIRouter()
notifier = EmailNotifier()


@router.post("/auth/register", response_model=schemas.UserRead)
def register(user_create: schemas.UserCreate, db: Session = Depends(get_db)):
    try:
        existing = crud.get_user_by_email(db, user_create.email)
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        db_user = models.User(
            email=user_create.email,
            full_name=user_create.full_name,
            hashed_password=auth.get_password_hash(user_create.password),
            plan="free"
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Registration error: {str(e)}")


@router.post("/auth/token", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    try:
        user = crud.get_user_by_email(db, form_data.username)
        if not user or not auth.verify_password(form_data.password, user.hashed_password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
        access_token = auth.create_access_token(subject=user.email, expires_delta=timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES))
        return {"access_token": access_token, "token_type": "bearer"}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Login error: {str(e)}")


@router.get("/users/me", response_model=schemas.UserRead)
def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


from redis import Redis


PLAN_LIMITS = {
    "free": 1,
    "family": 5,
}


@router.post("/emails", response_model=schemas.MonitoredEmailRead)
async def add_monitored_email(email_in: schemas.MonitoredEmailCreate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    limit = PLAN_LIMITS.get(current_user.plan, 1)
    if len(current_user.monitored_emails) >= limit:
        raise HTTPException(status_code=400, detail=f"Maximum {limit} monitored emails reached for {current_user.plan} plan")
    token = str(uuid.uuid4())
    monitored_email = crud.create_monitored_email(db, owner_id=current_user.id, email=email_in.email, token=token)
    asyncio.create_task(notifier.send_verification(email_in.email, token))
    # Try to enqueue for scanning (optional - may fail if Redis unavailable)
    try:
        redis_client = Redis.from_url("redis://localhost:6379/0", decode_responses=True)
        redis_client.ping()
        scan_engine = ScanEngine(redis_client)
        scan_engine.enqueue_email(monitored_email.id)
    except Exception:
        pass  # Redis not available, skip scanning
    return monitored_email


@router.get("/emails", response_model=list[schemas.MonitoredEmailRead])
def list_monitored_emails(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    return crud.get_monitored_emails(db, current_user.id)


@router.post("/emails/verify", response_model=schemas.VerificationResponse)
def verify_email(request: schemas.EmailVerifyRequest, db: Session = Depends(get_db)):
    monitored = db.query(models.MonitoredEmail).filter(models.MonitoredEmail.email == request.email, models.MonitoredEmail.verification_token == request.token).first()
    if not monitored:
        return schemas.VerificationResponse(success=False, message="Invalid verification token.")
    crud.mark_email_verified(db, monitored)
    return schemas.VerificationResponse(success=True, message="Email verified. Monitoring is now active.")


@router.get("/emails/{email_id}/breaches", response_model=list[schemas.BreachEventRead])
def email_breaches(email_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    monitored = crud.get_monitored_email(db, email_id, current_user.id)
    if not monitored:
        raise HTTPException(status_code=404, detail="Monitored email not found")
    return crud.get_breach_events(db, monitored.id)


@router.post("/users/upgrade", response_model=schemas.UserRead)
def upgrade_plan(plan_data: schemas.PlanUpgrade, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if plan_data.plan not in PLAN_LIMITS:
        raise HTTPException(status_code=400, detail="Invalid plan. Choose 'free' or 'family'.")
    current_user.plan = plan_data.plan
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/scan/manual/{email_id}")
def manual_scan(email_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    monitored_email = crud.get_monitored_email(db, email_id, current_user.id)
    if not monitored_email:
        raise HTTPException(status_code=404, detail="Monitored email not found")
    if not monitored_email.is_verified:
        raise HTTPException(status_code=400, detail="Email must be verified before scanning")
    
    # Try Redis scan
    try:
        redis_client = Redis.from_url("redis://localhost:6379/0", decode_responses=True)
        redis_client.ping()
        scan_engine = ScanEngine(redis_client)
        scan_engine.enqueue_email(monitored_email.id)
        scan_engine.process_queue(db)  # Process immediately for demo
        return {"message": "Scan completed", "email_id": email_id}
    except Exception as e:
        # Fallback direct scan without Redis (privacy compliant)
        from ..services.hibp_client import HIBPClient
        from datetime import datetime
        hibp = HIBPClient(None)  # No Redis
        breaches = hibp.fetch_breaches(monitored_email.email)
        new_breaches = []
        for breach in breaches:
            breach_name = breach.get("Name") or breach.get("name")
            breached_on_str = breach.get("BreachDate")
            if breached_on_str:
                breached_on_str = breached_on_str.replace('Z', '+00:00')
            breached_on = datetime.fromisoformat(breached_on_str) if breached_on_str else datetime.utcnow()
            data_classes = breach.get("DataClasses", [])
            compromised_passwords = any("password" in item.lower() for item in data_classes)
            crud.create_breach_event(
                db,
                monitored_email_id=monitored_email.id,
                breach_name=breach_name,
                breached_on=breached_on,
                data_classes=data_classes,
                compromised_passwords=compromised_passwords,
            )
            new_breaches.append(breach_name)
        crud.purge_expired_breaches(db)
        return {"message": "Scan completed (no Redis)", "new_breaches": new_breaches}
