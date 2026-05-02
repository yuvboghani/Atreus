-- Mission: Arsenal Uploads Storage Bucket
-- Step 1: Create the storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('arsenal_uploads', 'arsenal_uploads', false) 
ON CONFLICT (id) DO NOTHING;

-- Step 2: RLS Policies for storage.objects
-- Note: Assuming storage.objects already has RLS enabled by default in Supabase.
-- If not, you may need to run: ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow users to upload their own files
CREATE POLICY "Users can upload their own raw resumes" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'arsenal_uploads' AND auth.uid() = owner);

-- Allow users to read their own files
CREATE POLICY "Users can read their own raw resumes" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'arsenal_uploads' AND auth.uid() = owner);

-- Allow users to update their own files
CREATE POLICY "Users can update their own raw resumes" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'arsenal_uploads' AND auth.uid() = owner);

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own raw resumes" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'arsenal_uploads' AND auth.uid() = owner);
