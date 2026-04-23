-- Add admin-only wholesale/stocking fields to products
alter table public.products
  add column if not exists wholesale_price numeric(10, 2),
  add column if not exists is_stocking_item boolean default false,
  add column if not exists shock_surplus_stock integer default 0;

-- Performance index for admin queries filtering stocking items
create index if not exists idx_products_stocking
  on public.products(vendor_id, is_stocking_item)
  where is_stocking_item = true;

-- Document intent
comment on column public.products.wholesale_price is
  'Distributor cost. Admin-only via RLS. NEVER expose to customers.';
comment on column public.products.is_stocking_item is
  'Premier classification: true = actively stocked SKU, false = non-stocking/special order.';
comment on column public.products.shock_surplus_stock is
  'Stock at Premier Shock Surplus warehouse (not in main feed).';

-- Admin check function
create or replace function public.is_current_user_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and lower(role) = 'admin'
  );
$$;

grant execute on function public.is_current_user_admin() to authenticated;

-- CRITICAL SECURITY: revoke column access on base table
-- (prevents non-admins from reading wholesale_price via `select *`)
revoke select (wholesale_price, is_stocking_item, shock_surplus_stock)
  on public.products from anon, authenticated;
grant select (wholesale_price, is_stocking_item, shock_surplus_stock)
  on public.products to service_role;

-- Admin-only view with computed margin columns
-- Uses security_invoker so RLS runs as the caller's identity
-- WHERE clause filters out all rows for non-admins
create or replace view public.products_admin
with (security_invoker = true)
as
  select
    p.*,
    p.price - coalesce(p.wholesale_price, 0) as margin_dollars,
    case
      when p.price > 0 and p.wholesale_price > 0
      then round(((p.price - p.wholesale_price) / p.price) * 100, 1)
      else null
    end as margin_percent
  from public.products p
  where public.is_current_user_admin();

revoke all on public.products_admin from public;
grant select on public.products_admin to authenticated;
