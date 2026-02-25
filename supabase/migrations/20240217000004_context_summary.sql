-- Mission: Architectural Resilience (008)

-- Add context_summary to applications
ALTER TABLE applications ADD COLUMN IF NOT EXISTS context_summary TEXT DEFAULT '';
