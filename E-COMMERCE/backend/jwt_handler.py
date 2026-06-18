import os
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from fastapi import HTTPException, Header
from dotenv import load_dotenv

load_dotenv()

SECRET    = os.getenv("JWT_SECRET", "shopsphere_secret")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
EXPIRE    = int(os.getenv("JWT_EXPIRE_MINUTES", 60))


def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=EXPIRE)
    }
    return jwt.encode(payload, SECRET, algorithm=ALGORITHM)


def verify_token(authorization: str = Header(...)) -> dict:
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid auth scheme")
        payload = jwt.decode(token, SECRET, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    except Exception:
        raise HTTPException(status_code=401, detail="Authorization header missing")
