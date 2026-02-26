-- Mission: Architect High-Performance Supabase Schema (004)

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------
-- Table 1: jobs (The Warehouse)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE, -- Critical for idempotency
    company TEXT NOT NULL,
    title TEXT NOT NULL,
    raw_text TEXT, -- Scraped HTML/Text fallback
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb, -- {yoe_min, yoe_max, salary_min, tech_stack, remote}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Extreme Performance Indexing
-- GIN index for fast containment queries on metadata
CREATE INDEX IF NOT EXISTS idx_jobs_metadata_gin ON jobs USING GIN (metadata jsonb_path_ops);
-- Standard indexes for filtering/sorting
CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs (company);
CREATE INDEX IF NOT EXISTS idx_jobs_title ON jobs (title);

-- RLS: jobs
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Public READ access
CREATE POLICY "Public jobs are viewable by everyone" 
ON jobs FOR SELECT 
USING (true);

-- Policy: Service Role ONLY for INSERT/UPDATE (ingestors)
-- Note: Service role bypasses RLS by default, but explicit policies can be safer documentation.
-- We usually don't need an explicit policy for service role if we don't grant write access to anon/authenticated.
-- But to be explicit that NO user can write:
CREATE POLICY "Users cannot insert jobs" 
ON jobs FOR INSERT 
WITH CHECK (false);

CREATE POLICY "Users cannot update jobs" 
ON jobs FOR UPDATE 
USING (false);

-- -----------------------------------------------------
-- Table 2: profiles (The User)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    skill_bank JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS: profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- -----------------------------------------------------
-- Table 3: resumes (The Arsenal)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    is_master BOOLEAN DEFAULT false,
    content_tex TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS: resumes
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own resumes" 
ON resumes FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own resumes" 
ON resumes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own resumes" 
ON resumes FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own resumes" 
ON resumes FOR DELETE 
USING (auth.uid() = user_id);

-- -----------------------------------------------------
-- Table 4: applications (The Factory)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    tailored_resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
    gap_analysis JSONB,
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS: applications
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own applications" 
ON applications FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own applications" 
ON applications FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own applications" 
ON applications FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own applications" 
ON applications FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger to handle new user creation (optional but recommended)
-- Function to handle new user
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call function on signup
-- Check if trigger exists first to avoid error on repeated runs is harder in SQL without standard conditional create trigger
-- We'll wrap in DO block or just attempt drop
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
