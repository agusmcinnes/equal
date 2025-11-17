-- Link goals with transactions for automatic balance tracking
-- This enables bidirectional relationship between goal movements and transactions

-- Add goal_id field to transactions table to link transactions with goals
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS goal_id uuid REFERENCES goals(id) ON DELETE SET NULL;

-- Add transaction_id field to goal_movements to link with the actual transaction
ALTER TABLE goal_movements
ADD COLUMN IF NOT EXISTS transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL;

-- Add wallet_id field to goal_movements to track which wallet was used
ALTER TABLE goal_movements
ADD COLUMN IF NOT EXISTS wallet_id uuid REFERENCES wallets(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_goal_id ON transactions(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_movements_transaction_id ON goal_movements(transaction_id);
CREATE INDEX IF NOT EXISTS idx_goal_movements_wallet_id ON goal_movements(wallet_id);

-- Create index for combined queries (user + goal + transaction)
CREATE INDEX IF NOT EXISTS idx_transactions_user_goal ON transactions(user_id, goal_id) WHERE goal_id IS NOT NULL;

-- Add comments to document the relationships
COMMENT ON COLUMN transactions.goal_id IS 'Reference to goal if this transaction is related to a goal deposit/withdrawal';
COMMENT ON COLUMN goal_movements.transaction_id IS 'Reference to the actual transaction created for this goal movement';
COMMENT ON COLUMN goal_movements.wallet_id IS 'Wallet used for this goal movement transaction';
