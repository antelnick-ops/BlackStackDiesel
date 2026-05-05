-- Track per-user terms acceptance for legal compliance.
-- Date-based version strings auto-document when each version was published.
alter table profiles
  add column if not exists terms_accepted_at timestamp with time zone,
  add column if not exists terms_version text;

-- Index helps the on-sign-in re-acceptance check stay fast.
create index if not exists idx_profiles_terms_version on profiles(terms_version);
