from app.database import SessionLocal
from app import crud, schemas

db = SessionLocal()
user_data = schemas.UserCreate(email='test3@example.com', password='testpass123')
try:
    user = crud.create_user(db, user_data)
    print('User created:', user.id, user.email)
except Exception as e:
    print('Error:', e)
    import traceback
    traceback.print_exc()
db.close()
