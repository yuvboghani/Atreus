-- Migration: Add missing columns for standalone Forge ingestion
-- These columns may not exist if the live DB was initialized
-- from an older schema snapshot.

-- Add url column to jobs (nullable for manual-paste jobs)
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS url TEXT;

-- Add raw_description column (stores full JD text)
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS raw_description TEXT;

-- Add status column (tracks tailoring lifecycle)
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'tailoring';

-- Add source column (identifies ingestion method)
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual_paste';

-- Add full description markdown column
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS full_description_markdown TEXT;

-- Add resume columns to profiles (may not exist)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS resume_text TEXT;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
