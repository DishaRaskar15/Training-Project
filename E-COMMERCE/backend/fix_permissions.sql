-- ============================================================
-- ShopSphere FIX — Run this in Supabase SQL Editor
-- https://supabase.com/dashboard/project/oinxnxmutxufkwwqsfms/sql/new
-- ============================================================

-- 1. Drop FK constraint on cart so user_id doesn't need to exist in users table
ALTER TABLE cart DROP CONSTRAINT IF EXISTS cart_user_id_fkey;

-- 2. Drop FK on orders too
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
ALTER TABLE wishlist DROP CONSTRAINT IF EXISTS wishlist_user_id_fkey;

-- 3. Make sure RLS is OFF on all tables
ALTER TABLE users       DISABLE ROW LEVEL SECURITY;
ALTER TABLE cart        DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders      DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist    DISABLE ROW LEVEL SECURITY;
ALTER TABLE products    DISABLE ROW LEVEL SECURITY;

-- 4. Grant full access to anon and authenticated roles
GRANT ALL ON TABLE users       TO anon, authenticated;
GRANT ALL ON TABLE cart        TO anon, authenticated;
GRANT ALL ON TABLE orders      TO anon, authenticated;
GRANT ALL ON TABLE order_items TO anon, authenticated;
GRANT ALL ON TABLE wishlist    TO anon, authenticated;
GRANT ALL ON TABLE products    TO anon, authenticated;

-- 5. Grant sequence access (needed for INSERT with SERIAL primary keys)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
