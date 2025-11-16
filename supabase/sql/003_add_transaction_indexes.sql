-- Migration: Add performance indexes for transactions
-- Description: Improve query performance for common transaction queries
-- Created: 2025-11-15

-- Index for user transactions ordered by date (most common query)
CREATE INDEX IF NOT EXISTS idx_transactions_user_date
ON transactions(user_id, date DESC);

-- Index for filtering by transaction type
CREATE INDEX IF NOT EXISTS idx_transactions_user_type
ON transactions(user_id, type);

-- Index for filtering by category
CREATE INDEX IF NOT EXISTS idx_transactions_user_category
ON transactions(user_id, category_id)
WHERE category_id IS NOT NULL;

-- Index for filtering by wallet
CREATE INDEX IF NOT EXISTS idx_transactions_user_wallet
ON transactions(user_id, wallet_id)
WHERE wallet_id IS NOT NULL;

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_transactions_date
ON transactions(date);

-- Index for recurring transactions lookup
CREATE INDEX IF NOT EXISTS idx_transactions_recurring
ON transactions(recurring_id)
WHERE recurring_id IS NOT NULL;

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_transactions_user_date_type
ON transactions(user_id, date DESC, type);

-- Index for currency-specific queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_currency
ON transactions(user_id, currency);

-- Comments for documentation
COMMENT ON INDEX idx_transactions_user_date IS 'Primary index for user transaction list queries';
COMMENT ON INDEX idx_transactions_user_type IS 'Index for filtering transactions by income/expense type';
COMMENT ON INDEX idx_transactions_user_category IS 'Index for category-based filtering and statistics';
COMMENT ON INDEX idx_transactions_user_wallet IS 'Index for wallet-based filtering';
COMMENT ON INDEX idx_transactions_date IS 'Index for date-based queries and sorting';
COMMENT ON INDEX idx_transactions_recurring IS 'Index for recurring transaction relationships';
COMMENT ON INDEX idx_transactions_user_date_type IS 'Composite index for common filter patterns';
COMMENT ON INDEX idx_transactions_user_currency IS 'Index for currency-specific queries';
