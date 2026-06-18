from fastapi import APIRouter, HTTPException
from models import RegisterRequest, LoginRequest, AuthResponse, UserResponse
from database import supabase
from jwt_handler import create_token

router = APIRouter(prefix="/auth", tags=["Auth"])

# ─── STACK: tracks login session history server-side ─────────────────────────
login_stack: list = []


@router.post("/register", response_model=AuthResponse)
def register(data: RegisterRequest):
    try:
        # 1. Create auth user in Supabase Auth
        res = supabase.auth.sign_up({
            "email": data.email,
            "password": data.password,
            "options": {
                "data": {"full_name": data.full_name or ""}
            }
        })

        if res.user is None:
            raise HTTPException(status_code=400, detail="Registration failed")

        # 2. Store profile in 'users' table
        try:
            supabase.table("users").upsert({
                "id": str(res.user.id),
                "email": data.email,
                "full_name": data.full_name or "",
            }, on_conflict="id").execute()
        except Exception as e:
            print(f"User upsert warning: {e}")

        return AuthResponse(
            message="Registration successful! You can now log in.",
            user=UserResponse(
                id=str(res.user.id),
                email=res.user.email,
                full_name=data.full_name
            )
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=AuthResponse)
def login(data: LoginRequest):
    try:
        # Verify credentials against Supabase Auth
        res = supabase.auth.sign_in_with_password({
            "email": data.email,
            "password": data.password
        })

        if res.user is None:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # Fetch full_name from users table safely
        profile = supabase.table("users").select("full_name").eq("id", str(res.user.id)).execute()
        full_name = profile.data[0].get("full_name", "") if profile.data else res.user.user_metadata.get("full_name", "")

        # Generate our own JWT token
        jwt_token = create_token(str(res.user.id), res.user.email)

        # ── STACK PUSH: push login session onto stack ─────────────────────────
        login_stack.append({
            "email": res.user.email,
            "user_id": str(res.user.id),
            "access_token": jwt_token
        })

        return AuthResponse(
            message="Login successful",
            user=UserResponse(
                id=str(res.user.id),
                email=res.user.email,
                full_name=full_name
            ),
            access_token=jwt_token
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/logout")
def logout():
    if not login_stack:
        raise HTTPException(status_code=400, detail="No active session")

    # ── STACK POP: remove the most recent session ─────────────────────────────
    session = login_stack.pop()
    supabase.auth.sign_out()
    return {"message": f"User {session['email']} logged out successfully"}


@router.get("/session-stack")
def get_session_stack():
    return {
        "stack_size": len(login_stack),
        "top": login_stack[-1] if login_stack else None,
        "all_sessions": list(reversed(login_stack))
    }
