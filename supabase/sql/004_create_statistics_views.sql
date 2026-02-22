-- Migration: Create views for transaction statistics
-- Description: Pre-calculated views for common statistical queries
-- Created: 2025-11-15

-- View: Monthly transaction summary by user
CREATE OR REPLACE VIEW transaction_monthly_summary AS
SELECT
    user_id,
    DATE_TRUNC('month', date) as month,
    type,
    currency,
    COUNT(*) as transaction_count,
    SUM(amount) as total_amount,
    AVG(amount) as avg_amount,
    MIN(amount) as min_amount,
    MAX(amount) as max_amount
FROM transactions
WHERE type IN ('income', 'expense')
GROUP BY user_id, DATE_TRUNC('month', date), type, currency;

COMMENT ON VIEW transaction_monthly_summary IS 'Monthly aggregated transaction statistics by user, type, and currency';

-- View: Category distribution by user
CREATE OR REPLACE VIEW transaction_category_summary AS
SELECT
    t.user_id,
    t.category_id,
    c.name as category_name,
    c.type as category_type,
    c.color as category_color,
    c.icon as category_icon,
    t.type as transaction_type,
    t.currency,
    COUNT(*) as transaction_count,
    SUM(t.amount) as total_amount,
    AVG(t.amount) as avg_amount
FROM transactions t
LEFT JOIN categories c ON t.category_id = c.id
WHERE t.type IN ('income', 'expense')
GROUP BY t.user_id, t.category_id, c.name, c.type, c.color, c.icon, t.type, t.currency;

COMMENT ON VIEW transaction_category_summary IS 'Transaction statistics grouped by category';

-- View: Daily transaction summary (last 90 days)
CREATE OR REPLACE VIEW transaction_daily_summary AS
SELECT
    user_id,
    DATE(date) as day,
    type,
    currency,
    COUNT(*) as transaction_count,
    SUM(amount) as total_amount
FROM transactions
WHERE date >= CURRENT_DATE - INTERVAL '90 days'
    AND type IN ('income', 'expense')
GROUP BY user_id, DATE(date), type, currency;

COMMENT ON VIEW transaction_daily_summary IS 'Daily transaction summary for the last 90 days';

-- View: Wallet balance calculation
CREATE OR REPLACE VIEW wallet_current_balance AS
SELECT
    w.id as wallet_id,
    w.user_id,
    w.name as wallet_name,
    w.provider,
    w.currency,
    w.balance as initial_balance,
        COALESCE(SUM(
            CASE
                WHEN t.type = 'income' THEN t.amount
                WHEN t.type = 'expense' THEN -t.amount
                ELSE t.amount
            END
        ), 0) as transaction_total,
        w.balance + COALESCE(SUM(
            CASE
                WHEN t.type = 'income' THEN t.amount
                WHEN t.type = 'expense' THEN -t.amount
                ELSE t.amount
            END
        ), 0) as current_balance,
    COUNT(t.id) as transaction_count
FROM wallets w
LEFT JOIN transactions t ON w.id = t.wallet_id AND w.currency = t.currency
GROUP BY w.id, w.user_id, w.name, w.provider, w.currency, w.balance;

COMMENT ON VIEW wallet_current_balance IS 'Real-time wallet balance including all transactions';

-- View: User financial summary
CREATE OR REPLACE VIEW user_financial_summary AS
SELECT
    user_id,
    currency,
    SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
    SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses,
    SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as net_balance,
    COUNT(*) as total_transactions,
    COUNT(CASE WHEN type = 'income' THEN 1 END) as income_count,
    COUNT(CASE WHEN type = 'expense' THEN 1 END) as expense_count
FROM transactions
WHERE type IN ('income', 'expense')
GROUP BY user_id, currency;

COMMENT ON VIEW user_financial_summary IS 'Overall financial summary by user and currency';

-- View: Recent transactions with related data (for efficient listing)
CREATE OR REPLACE VIEW transactions_with_details AS
SELECT
    t.id,
    t.user_id,
    t.date,
    t.description,
    t.amount,
    t.currency,
    t.crypto_type,
    t.type,
    t.is_recurring,
    t.recurring_id,
    t.created_at,
    t.updated_at,
    c.id as category_id,
    c.name as category_name,
    c.color as category_color,
    c.icon as category_icon,
    c.type as category_type,
    w.id as wallet_id,
    w.name as wallet_name,
    w.provider as wallet_provider
FROM transactions t
LEFT JOIN categories c ON t.category_id = c.id
LEFT JOIN wallets w ON t.wallet_id = w.id;

COMMENT ON VIEW transactions_with_details IS 'Transactions with joined category and wallet details for efficient queries';

-- Grant permissions (RLS will still apply)
GRANT SELECT ON transaction_monthly_summary TO authenticated;
GRANT SELECT ON transaction_category_summary TO authenticated;
GRANT SELECT ON transaction_daily_summary TO authenticated;
GRANT SELECT ON wallet_current_balance TO authenticated;
GRANT SELECT ON user_financial_summary TO authenticated;
GRANT SELECT ON transactions_with_details TO authenticated;
