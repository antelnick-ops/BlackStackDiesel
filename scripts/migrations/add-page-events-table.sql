-- =====================================================================
-- page_events table — lightweight client-side event tracking
-- =====================================================================
-- The admin portal's Traffic page expects this table. Without it, the
-- page falls back to "Heads up: needs setup" callout.
--
-- This is a minimal schema sufficient to drive the existing admin
-- dashboard funnel (sessions, product views, add-to-cart, checkout-start,
-- purchases) plus search-gap and category-compare reports.
--
-- The PWA must be wired to write to this table on each meaningful event.
-- A separate companion patch to app/index.html does that wiring.

BEGIN;

CREATE TABLE IF NOT EXISTS public.page_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  text NOT NULL,                         -- client-side anonymous session id
  user_id     uuid REFERENCES auth.users(id),        -- nullable; logged-in users only
  event_type  text NOT NULL,                         -- view_page | view_product | add_to_cart | begin_checkout | search | filter
  category    text,                                  -- when applicable (product views, filter changes)
  product_sku text,                                  -- when applicable (product views, add-to-cart)
  search_term text,                                  -- when applicable (search events)
  vehicle_year text,                                 -- captured at event time, may differ from current
  vehicle_make text,
  vehicle_model text,
  vehicle_engine text,
  metadata    jsonb DEFAULT '{}'::jsonb,             -- catch-all for event-specific fields
  user_agent  text,
  referrer    text,
  page_url    text,
  created_at  timestamptz DEFAULT now()
);

-- Indexes for the queries the admin portal runs
CREATE INDEX IF NOT EXISTS idx_page_events_created_at ON public.page_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_events_event_type ON public.page_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_events_session_id ON public.page_events (session_id);
CREATE INDEX IF NOT EXISTS idx_page_events_user_id ON public.page_events (user_id) WHERE user_id IS NOT NULL;

-- RLS — anonymous and authenticated users can insert events. Only admins
-- can read aggregate data. Users can read their own events.
ALTER TABLE public.page_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "page_events_anon_insert" ON public.page_events;
CREATE POLICY "page_events_anon_insert" ON public.page_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "page_events_admin_read_all" ON public.page_events;
CREATE POLICY "page_events_admin_read_all" ON public.page_events
  FOR SELECT TO authenticated
  USING (is_current_user_admin());

DROP POLICY IF EXISTS "page_events_user_read_own" ON public.page_events;
CREATE POLICY "page_events_user_read_own" ON public.page_events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

COMMENT ON TABLE public.page_events IS
  'Lightweight client-side event log driving admin Traffic dashboard. PWA writes events; admins read aggregates.';

COMMIT;
