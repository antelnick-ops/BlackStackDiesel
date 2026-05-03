-- Tracks BSD's per-brand authorization requests against the ASAP Network.
-- Source of truth for which brands we've pinged, what came back, and when to follow up.

CREATE TABLE IF NOT EXISTS asap_brand_requests (
  id uuid primary key default gen_random_uuid(),
  brand_name text not null,
  asap_brand_id text,
  bsd_sku_count int,
  composite_score numeric,
  priority text, -- HIGH | MEDIUM | LOW
  requested_at timestamptz,
  approved_at timestamptz,
  status text default 'pending', -- pending | requested | approved | denied | not_on_asap
  last_synced_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE INDEX idx_asap_brand_requests_status ON asap_brand_requests(status);
CREATE INDEX idx_asap_brand_requests_priority ON asap_brand_requests(priority);

-- RLS
ALTER TABLE asap_brand_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_asap_brand_requests" ON asap_brand_requests
  FOR ALL USING (is_current_user_admin());
