from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from jwt_handler import verify_token
from database import supabase

router = APIRouter(prefix="/cart", tags=["Cart"])

# ─── IN-MEMORY DATA STRUCTURES ───────────────────────────────────────────────
# ArrayList per user  → stores current cart items
# Stack per user      → stores removed items for undo

carts:      dict = {}
undo_stack: dict = {}


class CartItem(BaseModel):
    id: int
    name: str
    price: int
    original: int
    image: str
    category: str


def get_cart(uid):
    if uid not in carts: carts[uid] = []
    return carts[uid]

def get_stack(uid):
    if uid not in undo_stack: undo_stack[uid] = []
    return undo_stack[uid]


# ─── ADD TO CART ──────────────────────────────────────────────────────────────
@router.post("/add")
def add_to_cart(item: CartItem, user=Depends(verify_token)):
    uid  = user["sub"]
    cart = get_cart(uid)

    cart.append(item.dict())        # ArrayList: append

    # Sync full item details to Supabase cart table
    try:
        existing = supabase.table("cart").select("id, quantity").eq("user_id", uid).eq("product_id", item.id).execute()
        if existing.data:
            supabase.table("cart").update({"quantity": existing.data[0]["quantity"] + 1}).eq("id", existing.data[0]["id"]).execute()
        else:
            supabase.table("cart").insert({
                "user_id": uid, "product_id": item.id, "name": item.name,
                "price": item.price, "original": item.original,
                "image": item.image, "category": item.category, "quantity": 1
            }).execute()
    except Exception:
        pass

    return {"message": f"'{item.name}' added to cart", "cart_size": len(cart)}


# ─── VIEW CART ────────────────────────────────────────────────────────────────
@router.get("/")
def view_cart(user=Depends(verify_token)):
    uid  = user["sub"]
    cart = get_cart(uid)

    # If memory cart is empty, reload from Supabase
    if not cart:
        try:
            rows = supabase.table("cart").select("product_id, quantity, products(*)").eq("user_id", uid).execute()
            for row in rows.data or []:
                p = row.get("products")
                if p:
                    cart.append({
                        "id": p["id"], "name": p["name"], "price": p["price"],
                        "original": p["original"], "image": p["image_url"],
                        "category": p["category"]
                    })
        except Exception:
            pass

    total = sum(item["price"] for item in cart)
    return {"cart": cart, "cart_size": len(cart), "total": total}


# ─── REMOVE FROM CART ─────────────────────────────────────────────────────────
@router.delete("/remove/{item_id}")
def remove_from_cart(item_id: int, user=Depends(verify_token)):
    uid   = user["sub"]
    cart  = get_cart(uid)
    stack = get_stack(uid)

    item = next((i for i in cart if i["id"] == item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found in cart")

    cart.remove(item)               # ArrayList: remove
    stack.append(item)              # Stack: push for undo

    # Sync to Supabase
    try:
        supabase.table("cart").delete().eq("user_id", uid).eq("product_id", item_id).execute()
    except Exception:
        pass

    return {"message": f"'{item['name']}' removed", "cart_size": len(cart)}


# ─── UNDO REMOVE ──────────────────────────────────────────────────────────────
@router.post("/undo")
def undo_remove(item: CartItem, user=Depends(verify_token)):
    uid   = user["sub"]
    cart  = get_cart(uid)
    stack = get_stack(uid)

    # Remove from server-side stack if present (best-effort)
    stack[:] = [i for i in stack if i["id"] != item.id]

    cart.append(item.dict())        # ArrayList: restore

    # Sync to Supabase
    try:
        existing = supabase.table("cart").select("id").eq("user_id", uid).eq("product_id", item.id).execute()
        if not existing.data:
            supabase.table("cart").insert({
                "user_id": uid, "product_id": item.id, "name": item.name,
                "price": item.price, "original": item.original,
                "image": item.image, "category": item.category, "quantity": 1
            }).execute()
    except Exception:
        pass

    return {"message": f"'{item.name}' restored to cart", "cart_size": len(cart)}


# ─── CLEAR CART ───────────────────────────────────────────────────────────────
@router.delete("/clear")
def clear_cart(user=Depends(verify_token)):
    uid = user["sub"]
    carts[uid]      = []
    undo_stack[uid] = []

    try:
        supabase.table("cart").delete().eq("user_id", uid).execute()
    except Exception:
        pass

    return {"message": "Cart cleared"}
