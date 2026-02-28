-- Add regex_data column to jobs_raw to store preliminary Scout extractions
ALTER TABLE jobs_raw ADD COLUMN IF NOT EXISTS regex_data JSONB DEFAULT '{}'::jsonb;
