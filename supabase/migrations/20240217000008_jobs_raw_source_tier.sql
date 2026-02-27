-- Alter jobs_raw to include source_tier
ALTER TABLE jobs_raw ADD COLUMN IF NOT EXISTS source_tier TEXT DEFAULT 'Tier 2';
