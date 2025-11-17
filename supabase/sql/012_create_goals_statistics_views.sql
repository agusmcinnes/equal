-- Create views for goal statistics and progress tracking
-- These views provide aggregated data for goals with their related transactions

-- View: Goal progress with movement summary
CREATE OR REPLACE VIEW goal_progress_summary AS
SELECT
  g.id as goal_id,
  g.user_id,
  g.name,
  g.description,
  g.target_amount,
  g.current_amount,
  g.currency,
  g.category,
  g.target_date,
  g.is_completed,
  g.wallet_id,
  COUNT(gm.id) as total_movements,
  COALESCE(SUM(CASE WHEN gm.type = 'deposit' THEN gm.amount ELSE 0 END), 0) as total_deposits,
  COALESCE(SUM(CASE WHEN gm.type = 'withdrawal' THEN gm.amount ELSE 0 END), 0) as total_withdrawals,
  CASE
    WHEN g.target_amount > 0 THEN ROUND((g.current_amount / g.target_amount * 100)::numeric, 2)
    ELSE 0
  END as progress_percentage,
  CASE
    WHEN g.target_date IS NOT NULL THEN
      EXTRACT(EPOCH FROM (g.target_date - NOW())) / 86400
    ELSE NULL
  END as days_remaining,
  g.created_at,
  g.updated_at
FROM goals g
LEFT JOIN goal_movements gm ON g.id = gm.goal_id
GROUP BY g.id, g.user_id, g.name, g.description, g.target_amount, g.current_amount,
         g.currency, g.category, g.target_date, g.is_completed, g.wallet_id,
         g.created_at, g.updated_at;

-- View: Goals with linked transactions
CREATE OR REPLACE VIEW goals_with_transactions AS
SELECT
  g.id as goal_id,
  g.user_id,
  g.name as goal_name,
  g.currency,
  g.current_amount,
  g.target_amount,
  t.id as transaction_id,
  t.date as transaction_date,
  t.amount as transaction_amount,
  t.type as transaction_type,
  t.description as transaction_description,
  t.wallet_id,
  w.name as wallet_name
FROM goals g
LEFT JOIN transactions t ON g.id = t.goal_id
LEFT JOIN wallets w ON t.wallet_id = w.id
WHERE t.id IS NOT NULL
ORDER BY t.date DESC;

-- View: User goals summary by currency
CREATE OR REPLACE VIEW user_goals_by_currency AS
SELECT
  user_id,
  currency,
  COUNT(*) as total_goals,
  COUNT(*) FILTER (WHERE is_completed = true) as completed_goals,
  COUNT(*) FILTER (WHERE is_completed = false) as active_goals,
  COALESCE(SUM(target_amount), 0) as total_target,
  COALESCE(SUM(current_amount), 0) as total_saved,
  CASE
    WHEN SUM(target_amount) > 0 THEN
      ROUND((SUM(current_amount) / SUM(target_amount) * 100)::numeric, 2)
    ELSE 0
  END as overall_progress_percentage
FROM goals
GROUP BY user_id, currency;

-- Add comments to document the views
COMMENT ON VIEW goal_progress_summary IS 'Detailed progress information for each goal including movement statistics';
COMMENT ON VIEW goals_with_transactions IS 'Goals linked with their associated transactions for tracking balance impact';
COMMENT ON VIEW user_goals_by_currency IS 'Aggregated goal statistics by user and currency';
