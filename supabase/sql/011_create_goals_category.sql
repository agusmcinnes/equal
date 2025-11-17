-- Create special category for goals/savings transactions
-- This category will be used automatically when creating transactions from goal movements

-- Insert the Goals/Savings category into default_categories
INSERT INTO public.default_categories (name, type, color, icon)
VALUES
  ('Ahorros/Objetivos', 'expense', '#463397', 'savings')
ON CONFLICT DO NOTHING;

-- Add comment to document the purpose
COMMENT ON TABLE public.default_categories IS 'Global category templates available for all users. The "Ahorros/Objetivos" category is used automatically for goal-related transactions.';
