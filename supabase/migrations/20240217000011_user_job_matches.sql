-- Multi-Tenant: Per-User Match Scores
-- Junction table for personalized scoring
CREATE TABLE IF NOT EXISTS user_job_matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id)
    ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id)
    ON DELETE CASCADE,
  match_score INT DEFAULT 0,
  match_analysis TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, job_id)
);

-- Drop global match_score from jobs table
ALTER TABLE jobs
  DROP COLUMN IF EXISTS match_score;

-- TTL Pruner: delete jobs older than 21 days
-- NOTE: Enable pg_cron extension first in
-- Supabase Dashboard > Database > Extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'prune-old-jobs',
  '0 3 * * *',
  $$DELETE FROM jobs
    WHERE created_at < NOW() - INTERVAL '21 days'$$
);
