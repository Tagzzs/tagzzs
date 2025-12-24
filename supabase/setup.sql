-- =============================================================================
-- Tagzzs - Supabase Database Setup
-- =============================================================================
-- Run this SQL in your Supabase SQL Editor to set up the required tables,
-- functions, triggers, and storage policies.
--
-- Prerequisites:
--   1. Create a Supabase project at https://supabase.com
--   2. Create storage buckets: user_avatars, user_uploads, user_thumbnails
--   3. Run this SQL in the SQL Editor
--
-- License: Apache-2.0
-- =============================================================================

-- =============================================================================
-- USERS TABLE
-- =============================================================================

-- Create users table
CREATE TABLE users (
  userid UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  avatar_url TEXT DEFAULT NULL,
  PRIMARY KEY (userid)
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) FOR USERS
-- =============================================================================

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = userid);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = userid);

-- Policy: Allow insert during signup
CREATE POLICY "Allow insert during signup" ON users
  FOR INSERT WITH CHECK (auth.uid() = userid);

-- =============================================================================
-- AUTO-CREATE USER PROFILE ON SIGNUP
-- =============================================================================

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (userid, name, email, created_at)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'name',
    NEW.email,
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- STORAGE POLICIES: user_avatars bucket
-- =============================================================================

CREATE POLICY "Allow insert for user avatars"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'user_avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Allow update for user avatars"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'user_avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Allow delete for user avatars"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'user_avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Allow select for user avatars"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'user_avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- =============================================================================
-- STORAGE POLICIES: user_uploads bucket
-- =============================================================================

CREATE POLICY "Allow uploads on user-uploads"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'user_uploads' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Allow downloads on user-uploads"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'user_uploads' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Allow updates on user-uploads"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'user_uploads' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Allow deletes on user-uploads"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'user_uploads' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- =============================================================================
-- STORAGE POLICIES: user_thumbnails bucket
-- =============================================================================

CREATE POLICY "Allow uploads on user_thumbnails"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'user_thumbnails' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Allow downloads on user_thumbnails"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'user_thumbnails' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Allow updates on user_thumbnails"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'user_thumbnails' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Allow deletes on user_thumbnails"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'user_thumbnails' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
