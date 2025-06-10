-- Database Cleanup and Schema Verification Script
-- Run this in your Supabase SQL Editor to fix authentication and data issues

-- 1. Clean up orphaned user data and reset authentication
BEGIN;

-- Remove orphaned records from custom tables where auth.users record doesn't exist
DELETE FROM user_settings 
WHERE user_id NOT IN (SELECT id FROM auth.users);

DELETE FROM current_stats 
WHERE user_id NOT IN (SELECT id FROM auth.users);

DELETE FROM meets 
WHERE user_id NOT IN (SELECT id FROM auth.users);

DELETE FROM meet_goals 
WHERE user_id NOT IN (SELECT id FROM auth.users);

DELETE FROM weight_history 
WHERE user_id NOT IN (SELECT id FROM auth.users);

DELETE FROM equipment_checklist 
WHERE user_id NOT IN (SELECT id FROM auth.users);

DELETE FROM training_history 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- 2. Ensure weight_history has proper unique constraint
ALTER TABLE weight_history 
DROP CONSTRAINT IF EXISTS weight_history_user_id_date_key;

ALTER TABLE weight_history 
ADD CONSTRAINT weight_history_user_id_date_key 
UNIQUE (user_id, date);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_current_stats_user_id ON current_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_meets_user_id_active ON meets(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_meet_goals_user_meet ON meet_goals(user_id, meet_id);
CREATE INDEX IF NOT EXISTS idx_weight_history_user_date ON weight_history(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_equipment_user_id ON equipment_checklist(user_id);
CREATE INDEX IF NOT EXISTS idx_training_user_date ON training_history(user_id, training_date DESC);

-- 4. Reset RLS policies to ensure they work correctly
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;

DROP POLICY IF EXISTS "Users can view own stats" ON current_stats;
DROP POLICY IF EXISTS "Users can insert own stats" ON current_stats;
DROP POLICY IF EXISTS "Users can update own stats" ON current_stats;

DROP POLICY IF EXISTS "Users can view own meets" ON meets;
DROP POLICY IF EXISTS "Users can insert own meets" ON meets;
DROP POLICY IF EXISTS "Users can update own meets" ON meets;

DROP POLICY IF EXISTS "Users can view own goals" ON meet_goals;
DROP POLICY IF EXISTS "Users can insert own goals" ON meet_goals;
DROP POLICY IF EXISTS "Users can update own goals" ON meet_goals;

DROP POLICY IF EXISTS "Users can view own weight history" ON weight_history;
DROP POLICY IF EXISTS "Users can insert own weight history" ON weight_history;
DROP POLICY IF EXISTS "Users can update own weight history" ON weight_history;

DROP POLICY IF EXISTS "Users can view own equipment" ON equipment_checklist;
DROP POLICY IF EXISTS "Users can insert own equipment" ON equipment_checklist;
DROP POLICY IF EXISTS "Users can update own equipment" ON equipment_checklist;

DROP POLICY IF EXISTS "Users can view own training" ON training_history;
DROP POLICY IF EXISTS "Users can insert own training" ON training_history;
DROP POLICY IF EXISTS "Users can update own training" ON training_history;

-- Create new, simplified RLS policies
-- User Settings
CREATE POLICY "Enable all operations for users on own settings" ON user_settings
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Current Stats
CREATE POLICY "Enable all operations for users on own stats" ON current_stats
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Meets
CREATE POLICY "Enable all operations for users on own meets" ON meets
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Meet Goals
CREATE POLICY "Enable all operations for users on own goals" ON meet_goals
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Weight History
CREATE POLICY "Enable all operations for users on own weight history" ON weight_history
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Equipment Checklist
CREATE POLICY "Enable all operations for users on own equipment" ON equipment_checklist
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Training History
CREATE POLICY "Enable all operations for users on own training" ON training_history
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Ensure all tables have RLS enabled
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE current_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE meets ENABLE ROW LEVEL SECURITY;
ALTER TABLE meet_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_history ENABLE ROW LEVEL SECURITY;

-- 6. Add helpful functions for debugging
CREATE OR REPLACE FUNCTION debug_user_data()
RETURNS TABLE (
  table_name text,
  record_count bigint,
  user_ids text[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 'user_settings'::text, COUNT(*), ARRAY_AGG(DISTINCT user_id::text)
  FROM user_settings
  UNION ALL
  SELECT 'current_stats'::text, COUNT(*), ARRAY_AGG(DISTINCT user_id::text)
  FROM current_stats
  UNION ALL
  SELECT 'meets'::text, COUNT(*), ARRAY_AGG(DISTINCT user_id::text)
  FROM meets
  UNION ALL
  SELECT 'weight_history'::text, COUNT(*), ARRAY_AGG(DISTINCT user_id::text)
  FROM weight_history
  UNION ALL
  SELECT 'equipment_checklist'::text, COUNT(*), ARRAY_AGG(DISTINCT user_id::text)
  FROM equipment_checklist
  UNION ALL
  SELECT 'training_history'::text, COUNT(*), ARRAY_AGG(DISTINCT user_id::text)
  FROM training_history;
END;
$$;

COMMIT;

-- 7. Verification queries (run these after the above)
-- Check that all constraints exist
SELECT 
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public'
  AND tc.table_name IN (
    'user_settings', 'current_stats', 'meets', 'meet_goals', 
    'weight_history', 'equipment_checklist', 'training_history'
  )
ORDER BY tc.table_name, tc.constraint_type;

-- Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check for orphaned data
SELECT * FROM debug_user_data();
