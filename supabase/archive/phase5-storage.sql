-- Phase 5: Create storage bucket for mission photos
-- Run this in Supabase SQL Editor

-- Create the photos bucket (public so images can be displayed)
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to upload photos (participants don't have auth accounts)
CREATE POLICY "Allow public uploads" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'photos');

-- Allow anyone to read photos
CREATE POLICY "Allow public reads" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'photos');
