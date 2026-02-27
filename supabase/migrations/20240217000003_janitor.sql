-- Mission: Implement the Database Janitor (Auto-Cleanup) (006)

-- Add the is_saved column to the jobs table for cleanup tracking
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_saved BOOLEAN DEFAULT false;

-- Create an index specifically for the cleanup routine to make deletions lightning-fast
CREATE INDEX IF NOT EXISTS idx_jobs_cleanup ON jobs (is_saved, created_at, match_score);
