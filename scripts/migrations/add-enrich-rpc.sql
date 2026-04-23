-- RPC for batched wholesale enrichment from ItemExport feed
-- Accepts a JSONB array of {id, wholesale_price, is_stocking_item, shock_surplus_stock}
-- Returns the number of rows updated

create or replace function public.enrich_product_wholesale(updates jsonb)
returns integer
language plpgsql
security definer
as $$
declare
  updated_count integer := 0;
  r jsonb;
begin
  for r in select * from jsonb_array_elements(updates)
  loop
    update public.products
    set
      wholesale_price = (r->>'wholesale_price')::numeric,
      is_stocking_item = (r->>'is_stocking_item')::boolean,
      shock_surplus_stock = (r->>'shock_surplus_stock')::integer
    where id = (r->>'id')::uuid;

    if found then
      updated_count := updated_count + 1;
    end if;
  end loop;

  return updated_count;
end;
$$;

-- Only service_role can execute (not exposed to customers or public)
revoke all on function public.enrich_product_wholesale(jsonb) from public, anon, authenticated;
grant execute on function public.enrich_product_wholesale(jsonb) to service_role;
