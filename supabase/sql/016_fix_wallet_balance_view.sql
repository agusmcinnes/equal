-- Fix wallet_current_balance view to match TypeScript model
-- The view was using wallet_id and wallet_name instead of id and name

DROP VIEW IF EXISTS wallet_current_balance;

CREATE OR REPLACE VIEW wallet_current_balance AS
SELECT
    w.id,
    w.user_id,
    w.name,
    w.provider,
    w.currency,
    w.balance as initial_balance,
    w.created_at,
    w.updated_at,
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
GROUP BY w.id, w.user_id, w.name, w.provider, w.currency, w.balance, w.created_at, w.updated_at;

COMMENT ON VIEW wallet_current_balance IS 'Real-time wallet balance including all transactions - fixed column names';

GRANT SELECT ON wallet_current_balance TO authenticated;
