-- Create financial goals table
CREATE TABLE IF NOT EXISTS goals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  target_amount numeric NOT NULL DEFAULT 0,
  current_amount numeric NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'general', -- Categoría del objetivo (viaje, coche, casa, etc)
  icon character varying DEFAULT 'flag',
  color character varying DEFAULT '#463397',
  target_date timestamp with time zone,
  is_completed boolean DEFAULT FALSE,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT target_amount_positive CHECK (target_amount > 0),
  CONSTRAINT current_amount_valid CHECK (current_amount >= 0)
);

-- Create goal movements table for tracking deposits/withdrawals
CREATE TABLE IF NOT EXISTS goal_movements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  type text NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
  description text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_goals_user_completed ON goals(user_id, is_completed);
CREATE INDEX idx_goal_movements_goal_id ON goal_movements(goal_id);
CREATE INDEX idx_goal_movements_user_id ON goal_movements(user_id);
CREATE INDEX idx_goal_movements_created ON goal_movements(created_at);

-- Create trigger to auto-update goals.updated_at
CREATE OR REPLACE FUNCTION trg_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_goals_updated_at
BEFORE UPDATE ON goals
FOR EACH ROW
EXECUTE FUNCTION trg_goals_updated_at();

-- Enable RLS on goals table
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_movements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for goals table
CREATE POLICY "Users can view their own goals"
ON goals FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals"
ON goals FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
ON goals FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
ON goals FOR DELETE
USING (auth.uid() = user_id);

-- Create RLS policies for goal_movements table
CREATE POLICY "Users can view their own goal movements"
ON goal_movements FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goal movements"
ON goal_movements FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goal movements"
ON goal_movements FOR DELETE
USING (auth.uid() = user_id);

-- Insert sample default goals (optional, for first-time setup)
-- These are commented out but can be enabled if needed
-- INSERT INTO goals (user_id, name, description, target_amount, category, icon, color, target_date)
-- SELECT 
--   auth.uid(),
--   'Mi Primer Objetivo',
--   'Comienza a ahorrar para alcanzar tus metas',
--   50000,
--   'ahorro',
--   'flag',
--   '#463397',
--   now() + interval '12 months'
-- WHERE NOT EXISTS (SELECT 1 FROM goals WHERE user_id = auth.uid());
