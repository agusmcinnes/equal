-- Configure Row Level Security (RLS) policies for wallets, goals, and goal_movements
-- This enables users to create and manage their own wallets and goals

-- Enable RLS on wallets table
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Enable RLS on goals table
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Enable RLS on goal_movements table
ALTER TABLE public.goal_movements ENABLE ROW LEVEL SECURITY;

-- ===== WALLETS POLICIES =====

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own wallets" ON public.wallets;
DROP POLICY IF EXISTS "Users can insert their own wallets" ON public.wallets;
DROP POLICY IF EXISTS "Users can update their own wallets" ON public.wallets;
DROP POLICY IF EXISTS "Users can delete their own wallets" ON public.wallets;

-- Policy: Users can view their own wallets
CREATE POLICY "Users can view their own wallets"
ON public.wallets
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own wallets
CREATE POLICY "Users can insert their own wallets"
ON public.wallets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own wallets
CREATE POLICY "Users can update their own wallets"
ON public.wallets
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own wallets
CREATE POLICY "Users can delete their own wallets"
ON public.wallets
FOR DELETE
USING (auth.uid() = user_id);

-- ===== GOALS POLICIES =====

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can insert their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can delete their own goals" ON public.goals;

-- Policy: Users can view their own goals
CREATE POLICY "Users can view their own goals"
ON public.goals
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own goals
CREATE POLICY "Users can insert their own goals"
ON public.goals
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own goals
CREATE POLICY "Users can update their own goals"
ON public.goals
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own goals
CREATE POLICY "Users can delete their own goals"
ON public.goals
FOR DELETE
USING (auth.uid() = user_id);

-- ===== GOAL MOVEMENTS POLICIES =====

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own goal movements" ON public.goal_movements;
DROP POLICY IF EXISTS "Users can insert their own goal movements" ON public.goal_movements;
DROP POLICY IF EXISTS "Users can update their own goal movements" ON public.goal_movements;
DROP POLICY IF EXISTS "Users can delete their own goal movements" ON public.goal_movements;

-- Policy: Users can view their own goal movements
CREATE POLICY "Users can view their own goal movements"
ON public.goal_movements
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own goal movements
CREATE POLICY "Users can insert their own goal movements"
ON public.goal_movements
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own goal movements
CREATE POLICY "Users can update their own goal movements"
ON public.goal_movements
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own goal movements
CREATE POLICY "Users can delete their own goal movements"
ON public.goal_movements
FOR DELETE
USING (auth.uid() = user_id);

COMMENT ON TABLE public.wallets IS 'User wallets with RLS enabled';
COMMENT ON TABLE public.goals IS 'User goals with RLS enabled';
COMMENT ON TABLE public.goal_movements IS 'User goal movements with RLS enabled';
