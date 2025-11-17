-- Add multi-currency support to goals table
-- This migration adds currency and wallet_id fields to enable goals in different currencies

-- Add currency field to goals table
ALTER TABLE goals
ADD COLUMN IF NOT EXISTS currency varchar(8) DEFAULT 'ARS';

-- Add optional wallet_id field to associate goals with specific wallets
ALTER TABLE goals
ADD COLUMN IF NOT EXISTS wallet_id uuid REFERENCES wallets(id) ON DELETE SET NULL;

-- Create index for better query performance when filtering by currency
CREATE INDEX IF NOT EXISTS idx_goals_user_currency ON goals(user_id, currency);

-- Create index for wallet_id lookups
CREATE INDEX IF NOT EXISTS idx_goals_wallet_id ON goals(wallet_id);

-- Update existing goals to have ARS as default currency
UPDATE goals
SET currency = 'ARS'
WHERE currency IS NULL;

-- Add comment to document the currency field
COMMENT ON COLUMN goals.currency IS 'Currency code for the goal (ARS, USD, EUR, CRYPTO)';
COMMENT ON COLUMN goals.wallet_id IS 'Optional wallet associated with this goal for automatic transactions';
