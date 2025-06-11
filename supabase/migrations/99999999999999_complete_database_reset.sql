-- Complete Database Reset Script
-- WARNING: This will delete ALL data in your database!
-- Only run this if you want to start completely fresh

-- Drop all existing tables and functions
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role;

-- Recreate the users table with proper structure
CREATE TABLE public.users (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    user_id text UNIQUE NOT NULL DEFAULT id::text,
    email text,
    full_name text,
    avatar_url text,
    token_identifier text NOT NULL,
    subscription text,
    credits text,
    image text,
    name text,
    unit_preference text DEFAULT 'kg',
    gender text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Create user settings table
CREATE TABLE public.user_settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id text NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    weight_unit text DEFAULT 'kg' CHECK (weight_unit IN ('kg', 'lbs')),
    theme text DEFAULT 'dark' CHECK (theme IN ('light', 'dark', 'system')),
    dashboard_start_tab text DEFAULT 'dashboard',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

-- Create powerlifting-specific tables
CREATE TABLE public.meets (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id text NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    meet_name text,
    meet_date date NOT NULL,
    location text,
    target_weight_class numeric NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.current_stats (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id text NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    weight numeric DEFAULT 0,
    squat_max numeric DEFAULT 0,
    bench_max numeric DEFAULT 0,
    deadlift_max numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

CREATE TABLE public.meet_goals (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id text NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    meet_id uuid NOT NULL REFERENCES public.meets(id) ON DELETE CASCADE,
    lift_type text NOT NULL CHECK (lift_type IN ('squat', 'bench', 'deadlift')),
    opener numeric DEFAULT 0,
    second numeric DEFAULT 0,
    third numeric DEFAULT 0,
    confidence numeric DEFAULT 5 CHECK (confidence >= 1 AND confidence <= 10),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, meet_id, lift_type)
);

CREATE TABLE public.equipment_checklist (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id text NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    name text NOT NULL,
    category text NOT NULL CHECK (category IN ('essential', 'optional', 'meet-day')),
    checked boolean DEFAULT false,
    custom_item boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.weight_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id text NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    date date NOT NULL,
    weight numeric NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, date)
);

CREATE TABLE public.training_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id text REFERENCES public.users(user_id) ON DELETE CASCADE,
    lift_type text CHECK (lift_type IN ('squat', 'bench', 'deadlift')),
    training_date date NOT NULL,
    sets integer NOT NULL,
    reps integer NOT NULL,
    weight numeric NOT NULL,
    rpe integer CHECK (rpe >= 1 AND rpe <= 10),
    volume numeric GENERATED ALWAYS AS (sets * reps * weight) STORED,
    estimated_1rm numeric,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Create subscription and webhook tables
CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id text REFERENCES public.users(user_id) ON DELETE CASCADE,
    polar_id text UNIQUE,
    polar_price_id text,
    currency text,
    interval text,
    status text,
    current_period_start bigint,
    current_period_end bigint,
    cancel_at_period_end boolean,
    amount bigint,
    started_at bigint,
    ended_at bigint,
    canceled_at bigint,
    customer_cancellation_reason text,
    customer_cancellation_comment text,
    metadata jsonb,
    custom_field_data jsonb,
    customer_id text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.webhook_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type text NOT NULL,
    type text NOT NULL,
    polar_event_id text,
    data jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    modified_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    error text
);

-- Create indexes for better performance
CREATE INDEX idx_users_user_id ON public.users(user_id);
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_meets_user_id ON public.meets(user_id);
CREATE INDEX idx_meets_active ON public.meets(user_id, is_active);
CREATE INDEX idx_current_stats_user_id ON public.current_stats(user_id);
CREATE INDEX idx_meet_goals_user_id ON public.meet_goals(user_id);
CREATE INDEX idx_meet_goals_meet_id ON public.meet_goals(meet_id);
CREATE INDEX idx_equipment_user_id ON public.equipment_checklist(user_id);
CREATE INDEX idx_weight_history_user_id ON public.weight_history(user_id);
CREATE INDEX idx_weight_history_date ON public.weight_history(user_id, date DESC);
CREATE INDEX idx_training_history_user_id ON public.training_history(user_id);
CREATE INDEX idx_training_history_date ON public.training_history(user_id, training_date DESC);
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_polar_id ON public.subscriptions(polar_id);
CREATE INDEX idx_webhook_events_type ON public.webhook_events(type);
CREATE INDEX idx_webhook_events_polar_id ON public.webhook_events(polar_event_id);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.current_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meet_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
-- Users table policies
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- User settings policies
CREATE POLICY "Users can manage own settings" ON public.user_settings
    FOR ALL USING (auth.uid()::text = user_id);

-- Powerlifting data policies
CREATE POLICY "Users can manage own meets" ON public.meets
    FOR ALL USING (auth.uid()::text = user_id);

CREATE POLICY "Users can manage own stats" ON public.current_stats
    FOR ALL USING (auth.uid()::text = user_id);

CREATE POLICY "Users can manage own goals" ON public.meet_goals
    FOR ALL USING (auth.uid()::text = user_id);

CREATE POLICY "Users can manage own equipment" ON public.equipment_checklist
    FOR ALL USING (auth.uid()::text = user_id);

CREATE POLICY "Users can manage own weight history" ON public.weight_history
    FOR ALL USING (auth.uid()::text = user_id);

CREATE POLICY "Users can manage own training history" ON public.training_history
    FOR ALL USING (auth.uid()::text = user_id);

-- Subscription policies
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
    FOR SELECT USING (auth.uid()::text = user_id);

-- Webhook events (admin only)
CREATE POLICY "Service role can manage webhooks" ON public.webhook_events
    FOR ALL USING (auth.role() = 'service_role');

-- Create functions and triggers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    user_id,
    email,
    full_name,
    avatar_url,
    token_identifier,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.id::text,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.email, NEW.id::text),
    NEW.created_at,
    NEW.updated_at
  );
  
  -- Create default user settings
  INSERT INTO public.user_settings (
    user_id,
    weight_unit,
    theme,
    dashboard_start_tab
  ) VALUES (
    NEW.id::text,
    'kg',
    'dark',
    'dashboard'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to handle user updates
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET
    email = NEW.email,
    full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', full_name),
    avatar_url = NEW.raw_user_meta_data->>'avatar_url',
    updated_at = NEW.updated_at
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for user updates
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meets_updated_at BEFORE UPDATE ON public.meets
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_current_stats_updated_at BEFORE UPDATE ON public.current_stats
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meet_goals_updated_at BEFORE UPDATE ON public.meet_goals
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON public.equipment_checklist
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant specific permissions for anon users (for public access)
GRANT SELECT ON public.webhook_events TO anon;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';
