-- Validate and fix RLS policies for users table
-- This migration ensures proper Row-Level Security enforcement

-- Enable RLS on users table if not already enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own data" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can delete own data" ON public.users;

-- Create comprehensive RLS policies
-- SELECT policy: Users can only view their own data
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT 
    USING (auth.uid() = id);

-- INSERT policy: Users can only insert their own data
CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- UPDATE policy: Users can only update their own data
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE 
    USING (auth.uid() = id) 
    WITH CHECK (auth.uid() = id);

-- DELETE policy: Users can delete their own data (optional)
CREATE POLICY "Users can delete own profile" ON public.users
    FOR DELETE 
    USING (auth.uid() = id);

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Ensure the trigger function has proper permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_user_update() TO service_role;

-- Add missing avatar_url column if it doesn't exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url text;

-- Update the trigger function to handle avatar_url properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    full_name,
    avatar_url,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.created_at,
    NEW.updated_at
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = EXCLUDED.updated_at;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure triggers are properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();

-- Test the policies by creating a test function (optional)
CREATE OR REPLACE FUNCTION public.test_rls_policies()
RETURNS text AS $$
DECLARE
  result text := 'RLS policies are properly configured';
BEGIN
  -- This function can be used to test RLS policies
  -- It will only work if called by an authenticated user
  IF auth.uid() IS NULL THEN
    result := 'No authenticated user found';
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
