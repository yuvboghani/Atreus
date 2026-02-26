-- Mission: Ops Logistics & Terminal Alerts (006)

-- 1. Create Application Status Enum
-- We handle potential existing values by casting. If data is dirty, this might need cleanup first.
CREATE TYPE application_status AS ENUM ('saved', 'draft', 'applied', 'interviewing', 'rejected', 'offer');

-- 2. Alter applications table to use Enum
-- We drop the default first to avoid type mismatch issues during conversion, then re-apply
ALTER TABLE applications ALTER COLUMN status DROP DEFAULT;

ALTER TABLE applications 
  ALTER COLUMN status TYPE application_status 
  USING status::application_status;

ALTER TABLE applications ALTER COLUMN status SET DEFAULT 'draft';

-- 3. Add match_score to jobs
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS match_score INTEGER DEFAULT 0;

-- 4. Indexing
CREATE INDEX IF NOT EXISTS idx_jobs_match_score ON jobs(match_score);
