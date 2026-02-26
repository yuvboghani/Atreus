-- Mission: Add scoring profile columns & entry-level intelligence
-- Adds edu_level and current_yoe to profiles for the Intelligent Matching Engine.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS edu_level INTEGER DEFAULT 2;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_yoe INTEGER DEFAULT 0;
