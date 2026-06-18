**ShopSphere – Full Stack E-Commerce Web App**

🛠️ Tech Stack
Frontend: HTML, CSS, Vanilla JavaScript

Backend: Python, FastAPI

Database: Supabase (PostgreSQL)

Auth: JWT (JSON Web Tokens) + Supabase Auth

API Testing: Postman + Swagger UI (/docs)

✨ Features
User Registration & Login with JWT authentication

Product catalog with category filter

Add to Cart, Remove from Cart, Clear Cart

Undo Remove using Stack data structure

Wishlist toggle per user

Order Summary with dynamic pricing

Cart data persisted in Supabase database

Multi-user support — each user sees only their own cart

📊 Data Structures Used
ArrayList → Cart items (add, view, remove)

Stack → Undo remove (push on remove, pop on undo)

HashSet → Wishlist (no duplicates)

HashMap → Product filter by category

🔐 JWT Flow
User logs in → FastAPI verifies with Supabase Auth

Server signs a JWT token with user ID + expiry

Frontend stores token in localStorage

Every API request sends Authorization: Bearer <token>

Backend verifies token on every protected route

🗄️ Database Tables
users → user profiles

cart → cart items per user

products → product catalog

orders → order history

wishlist → saved items

🔗 API Endpoints
POST /auth/register → create account

POST /auth/login → get JWT token

GET /cart/ → view cart

POST /cart/add → add item

DELETE /cart/remove/{id} → remove item

POST /cart/undo → restore last removed item

DELETE /cart/clear → clear cart
