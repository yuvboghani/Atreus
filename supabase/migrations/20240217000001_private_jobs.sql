-- Mission: Frontend Overhaul - Private Jobs (005)

-- Add created_by column to jobs table to distinguish public (null) vs private (uuid) jobs
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Index for fast lookup of user's private jobs
CREATE INDEX IF NOT EXISTS idx_jobs_created_by ON jobs (created_by);

-- RLS Update: Allow users to see their own private jobs
-- Existing policy: "Public jobs are viewable by everyone" (USING true) -> This covers everything, which is mostly fine for now, 
-- but technically we might want to hide private jobs from others.
-- Let's update the read policy to be: Public jobs OR My jobs.

DROP POLICY IF EXISTS "Public jobs are viewable by everyone" ON jobs;

CREATE POLICY "Public and own jobs are viewable" 
ON jobs FOR SELECT 
USING (
    created_by IS NULL -- Public jobs
    OR 
    created_by = auth.uid() -- My private jobs
);

-- RLS Update: Allow users to insert/update their own private jobs
-- We previously blocked all inserts. Now we permit if created_by = auth.uid()

DROP POLICY IF EXISTS "Users cannot insert jobs" ON jobs;
DROP POLICY IF EXISTS "Users cannot update jobs" ON jobs;

CREATE POLICY "Users can insert own private jobs" 
ON jobs FOR INSERT 
WITH CHECK (
    created_by = auth.uid()
);

CREATE POLICY "Users can update own private jobs" 
ON jobs FOR UPDATE 
USING (created_by = auth.uid());

CREATE POLICY "Users can delete own private jobs" 
ON jobs FOR DELETE 
USING (created_by = auth.uid());
