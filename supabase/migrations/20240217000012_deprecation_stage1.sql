-- Mission: Deprecate Scout/Radar Job Tracking Data Models
-- Step 1: Make job_id nullable in applications to allow standalone tailoring
ALTER TABLE applications ALTER COLUMN job_id DROP NOT NULL;

-- Step 2: Add onboarding_completed flag to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
