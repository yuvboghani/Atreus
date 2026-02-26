-- Mission: Advanced Ingestion & Memory (007)

-- Add chat_history to applications
ALTER TABLE applications ADD COLUMN IF NOT EXISTS chat_history JSONB DEFAULT '[]'::jsonb;
