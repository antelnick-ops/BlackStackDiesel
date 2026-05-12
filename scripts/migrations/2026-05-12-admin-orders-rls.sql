-- 2026-05-12-admin-orders-rls.sql
--
-- Fixes admin portal seeing zero orders. After the RLS recursion fix
-- (fix-orders-rls-recursion.sql), only customer_email = auth.email()
-- policies remain — admin can't see other customers' orders.
--
-- Also adds columns the admin portal selects but don't exist yet.
--
-- Run in: Supabase SQL Editor
-- Date:   2026-05-12

BEGIN;

-- ============================================================
-- 1. ORDERS — allow admin to see all orders
-- ============================================================

DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (customer_email = auth.email() OR is_current_user_admin());

-- ============================================================
-- 2. ORDER_ITEMS — allow admin to see all order items
-- ============================================================

DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
CREATE POLICY "Users can view own order items"
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM public.orders
      WHERE customer_email = auth.email()
    )
    OR is_current_user_admin()
  );

-- ============================================================
-- 3. ADD MISSING COLUMNS to orders (future-proof)
-- ============================================================
-- Admin portal selects these; webhook doesn't populate them yet.
-- Adding with defaults prevents PostgREST 400 errors now.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stripe_fee NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_cost_paid NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vehicle_year INT,
  ADD COLUMN IF NOT EXISTS vehicle_make TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_model TEXT;

COMMIT;

-- ============================================================
-- 4. RELOAD POSTGREST SCHEMA CACHE
-- ============================================================

NOTIFY pgrst, 'reload schema';
