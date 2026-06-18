-- ============================================================
-- ShopSphere Supabase Database Setup
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/oinxnxmutxufkwwqsfms/sql/new
-- ============================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY,
    email       TEXT UNIQUE NOT NULL,
    full_name   TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT,
    price       INTEGER NOT NULL,
    original    INTEGER NOT NULL,
    category    TEXT NOT NULL,
    image_url   TEXT,
    badge       TEXT,
    rating      NUMERIC(2,1) DEFAULT 4.0,
    reviews     INTEGER DEFAULT 0,
    stock       INTEGER DEFAULT 100,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CART TABLE
CREATE TABLE IF NOT EXISTS cart (
    id          SERIAL PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id  INTEGER NOT NULL,
    name        TEXT NOT NULL,
    price       INTEGER NOT NULL,
    original    INTEGER NOT NULL,
    image       TEXT,
    category    TEXT,
    quantity    INTEGER DEFAULT 1,
    added_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
    id              SERIAL PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_email      TEXT,
    user_name       TEXT,
    subtotal        INTEGER NOT NULL,
    shipping        INTEGER DEFAULT 0,
    discount        INTEGER DEFAULT 0,
    total           INTEGER NOT NULL,
    status          TEXT DEFAULT 'pending',
    payment_method  TEXT DEFAULT 'razorpay',
    payment_id      TEXT,
    razorpay_order_id TEXT,
    upi_vpa         TEXT DEFAULT '7378593531@ybl',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS order_items (
    id          SERIAL PRIMARY KEY,
    order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id  INTEGER,
    name        TEXT NOT NULL,
    price       INTEGER NOT NULL,
    quantity    INTEGER DEFAULT 1,
    image       TEXT
);

-- 6. WISHLIST TABLE
CREATE TABLE IF NOT EXISTS wishlist (
    id          SERIAL PRIMARY KEY,
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id  INTEGER,
    added_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- 7. DISABLE RLS ON ALL TABLES
ALTER TABLE users        DISABLE ROW LEVEL SECURITY;
ALTER TABLE products     DISABLE ROW LEVEL SECURITY;
ALTER TABLE cart         DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders       DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items  DISABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist     DISABLE ROW LEVEL SECURITY;

-- 8. SEED PRODUCTS
INSERT INTO products (name, description, price, original, category, image_url, badge, rating, reviews) VALUES
('Floral Print Crop Top',      'Lightweight cotton crop top with vibrant floral print. Perfect for casual outings.',   599,  999,  'tops',   'https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=400&q=80', 'Bestseller', 4.5, 128),
('Boho Maxi Dress',            'Flowy bohemian maxi dress in soft rayon fabric. Ideal for beach & casual events.',     1299, 2199, 'dress',  'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400&q=80', '40% OFF',    4.7, 214),
('Embroidered Anarkali Kurta', 'Elegant anarkali kurta with intricate embroidery. Great for festive occasions.',       1799, 2999, 'ethnic', 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400&q=80', 'New',        4.8, 342),
('High-Waist Skinny Jeans',    'Stretchable high-waist skinny jeans in classic blue denim. All-day comfort.',          1099, 1799, 'jeans',  'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400&q=80', 'Trending',   4.4, 189),
('Solid Ribbed Tank Top',      'Minimalist ribbed tank top in earthy tones. Layer it or wear it solo.',                449,  699,  'tops',   'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=400&q=80', '',           4.3, 96),
('Wrap Midi Dress',            'Elegant wrap-style midi dress with a flattering silhouette. Office to party ready.',   1499, 2499, 'dress',  'https://images.unsplash.com/photo-1518622358385-8ea7d0794bf6?w=400&q=80', 'Hot',        4.6, 173),
('Printed Cotton Saree',       'Soft cotton saree with traditional block print design. Comes with a blouse piece.',   2199, 3499, 'ethnic', 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80', 'Top Rated',  4.9, 410),
('Ripped Boyfriend Jeans',     'Trendy ripped boyfriend jeans with a relaxed fit. Style it with any crop top.',       1249, 1999, 'jeans',  'https://images.unsplash.com/photo-1555689502-c4b22d76c56f?w=400&q=80', 'Trending',   4.5, 231)
ON CONFLICT DO NOTHING;
