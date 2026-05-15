-- fix-orders-rls-recursion.sql
--
-- Problem: SELECT policies on orders and order_items contain circular
-- subselects (orders → order_items → orders), causing PostgreSQL error
-- 42P17 "infinite recursion detected in policy". All authenticated reads
-- on both tables fail — Order History and profile stats are broken.
--
-- Root cause: "Vendors see own orders" subselects order_items, and
-- "Customers see own order items" subselects orders.customer_id (which
-- doesn't exist). Additionally "Customers see own orders" references
-- customer_id = auth.uid() — column also doesn't exist on orders table.
--
-- Fix: drop the four broken policies, keep the one working policy on
-- orders ("Users can view own orders"), and add a non-recursive SELECT
-- policy on order_items.
--
-- Run in: Supabase SQL Editor
-- Date:   2026-05-11

BEGIN;

-- ============================================================
-- 1. DROP the four broken SELECT policies
-- ============================================================

-- orders: references non-existent customer_id column
DROP POLICY "Customers see own orders" ON public.orders;

-- orders: recursive subselect on order_items (recursion source)
DROP POLICY "Vendors see own orders" ON public.orders;

-- order_items: recursive subselect on orders.customer_id (recursion + broken column)
DROP POLICY "Customers see own order items" ON public.order_items;

-- order_items: vendor login not part of BSD architecture
DROP POLICY "Vendors see own order items" ON public.order_items;

-- ============================================================
-- 2. KEEP existing working policy (no action needed)
-- ============================================================
-- "Users can view own orders" ON orders
--   FOR SELECT TO authenticated
--   USING (customer_email = auth.email())

-- ============================================================
-- 3. CREATE non-recursive SELECT policy on order_items
-- ============================================================
-- Uses auth.email() to match the existing orders policy syntax.
-- One-directional: order_items → orders. No recursion because the
-- orders policy ("Users can view own orders") does not reference
-- order_items.

CREATE POLICY "Users can view own order items"
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING (order_id IN (
    SELECT id FROM public.orders
    WHERE customer_email = auth.email()
  ));

COMMIT;

-- ============================================================
-- Verification (run after migration)
-- ============================================================
-- SELECT tablename, policyname, cmd, qual::text
-- FROM pg_policies
-- WHERE tablename IN ('orders', 'order_items');
--
-- Expected result: exactly 2 rows
--   orders      | Users can view own orders      | SELECT | customer_email = auth.email()
--   order_items | Users can view own order items  | SELECT | order_id IN (SELECT id FROM orders WHERE ...)
--
-- Webhook INSERT safety: api/webhook.js uses SUPABASE_SERVICE_KEY
-- (service_role), which bypasses RLS. No INSERT policies are touched.
