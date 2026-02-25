-- Mission: Add resume_text to profiles for Arsenal functionality
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS resume_text TEXT DEFAULT '';
