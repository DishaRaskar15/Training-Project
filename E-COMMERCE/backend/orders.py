from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
from jwt_handler import verify_token
from database import supabase
import razorpay
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/orders", tags=["Orders"])

# Razorpay client — uses test keys, replace with live keys for production
RAZORPAY_KEY_ID     = os.getenv("RAZORPAY_KEY_ID", "rzp_test_key")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "rzp_test_secret")
UPI_VPA             = "7378593531@ybl"


class OrderItem(BaseModel):
    id: int
    name: str
    price: int
    original: int
    image: str
    category: str


class PlaceOrderRequest(BaseModel):
    items: List[OrderItem]
    subtotal: int
    shipping: int
    discount: int
    total: int


# ─── PLACE ORDER ──────────────────────────────────────────────────────────────
@router.post("/place")
def place_order(data: PlaceOrderRequest, user=Depends(verify_token)):
    uid = user["sub"]

    # Fetch user profile
    try:
        profile = supabase.table("users").select("email, full_name").eq("id", uid).execute()
        u = profile.data[0] if profile.data else {}
    except Exception:
        u = {}

    # 1. Save order to Supabase orders table
    try:
        order_res = supabase.table("orders").insert({
            "user_id":        uid,
            "user_email":     u.get("email", user.get("email", "")),
            "user_name":      u.get("full_name", ""),
            "subtotal":       data.subtotal,
            "shipping":       data.shipping,
            "discount":       data.discount,
            "total":          data.total,
            "status":         "pending",
            "payment_method": "razorpay_upi",
            "upi_vpa":        UPI_VPA
        }).execute()

        order_id = order_res.data[0]["id"]

        # 2. Save each order item
        for item in data.items:
            supabase.table("order_items").insert({
                "order_id":   order_id,
                "product_id": item.id,
                "name":       item.name,
                "price":      item.price,
                "quantity":   1,
                "image":      item.image
            }).execute()

        # 3. Clear user cart after order
        supabase.table("cart").delete().eq("user_id", uid).execute()

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Order save failed: {str(e)}")

    # 4. Create Razorpay order
    razorpay_order = None
    try:
        client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
        razorpay_order = client.order.create({
            "amount":   data.total * 100,   # in paise
            "currency": "INR",
            "receipt":  f"order_{order_id}",
            "notes":    {"upi_vpa": UPI_VPA}
        })
        # Update order with razorpay order id
        supabase.table("orders").update({"razorpay_order_id": razorpay_order["id"]}).eq("id", order_id).execute()
    except Exception:
        pass  # Razorpay optional — order still saved

    return {
        "message":          "Order placed successfully!",
        "order_id":         order_id,
        "total":            data.total,
        "upi_vpa":          UPI_VPA,
        "razorpay_key":     RAZORPAY_KEY_ID,
        "razorpay_order":   razorpay_order
    }


# ─── GET USER ORDERS ──────────────────────────────────────────────────────────
@router.get("/my-orders")
def get_my_orders(user=Depends(verify_token)):
    uid = user["sub"]
    try:
        orders = supabase.table("orders").select("*").eq("user_id", uid).order("created_at", desc=True).execute()
        return {"orders": orders.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── UPDATE ORDER STATUS (after payment) ─────────────────────────────────────
@router.post("/confirm/{order_id}")
def confirm_order(order_id: int, user=Depends(verify_token)):
    try:
        supabase.table("orders").update({"status": "paid"}).eq("id", order_id).execute()
        return {"message": "Order confirmed and marked as paid"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
