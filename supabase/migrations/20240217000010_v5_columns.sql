-- Radar V5: Full-Context Intelligence columns
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS full_description_markdown TEXT,
  ADD COLUMN IF NOT EXISTS scrape_status VARCHAR DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS key_priorities JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS tech_stack JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS salary_range TEXT,
  ADD COLUMN IF NOT EXISTS remote_status TEXT DEFAULT 'unknown';
