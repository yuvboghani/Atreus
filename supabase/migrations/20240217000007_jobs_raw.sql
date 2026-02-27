-- Create the Raw Jobs Queue Table
CREATE TABLE IF NOT EXISTS jobs_raw (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    absolute_url TEXT UNIQUE NOT NULL,
    snippet TEXT,
    is_processed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient querying by The Architect
CREATE INDEX IF NOT EXISTS idx_jobs_raw_unprocessed ON jobs_raw (is_processed) WHERE is_processed = false;
