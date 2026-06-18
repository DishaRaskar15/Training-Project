from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from auth import router as auth_router
from cart import router as cart_router
from orders import router as orders_router
from jwt_handler import verify_token

app = FastAPI(
    title="ShopSphere API",
    description="Smart E-Commerce Platform Backend",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(cart_router)
app.include_router(orders_router)

@app.get("/")
def root():
    return {"message": "Welcome to ShopSphere API 🛒"}

@app.get("/protected")
def protected(user=Depends(verify_token)):
    return {"message": f"Hello {user['email']}, your JWT is valid!", "user": user}
