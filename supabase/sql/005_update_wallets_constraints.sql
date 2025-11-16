-- Migration: Update wallets table constraints and triggers
-- Description: Add constraints for data integrity and triggers for balance updates
-- Created: 2025-11-15

-- Add check constraint for balance (can be negative for credit cards)
-- Remove if exists first
ALTER TABLE wallets DROP CONSTRAINT IF EXISTS check_balance_valid;

-- Add constraint to ensure currency is valid
ALTER TABLE wallets DROP CONSTRAINT IF EXISTS check_currency_valid;
ALTER TABLE wallets ADD CONSTRAINT check_currency_valid
CHECK (currency IN ('ARS', 'USD', 'EUR', 'CRYPTO'));

-- Add constraint to ensure provider is not empty
ALTER TABLE wallets DROP CONSTRAINT IF EXISTS check_provider_not_empty;
ALTER TABLE wallets ADD CONSTRAINT check_provider_not_empty
CHECK (length(trim(provider)) > 0);

-- Add constraint to ensure name is not empty
ALTER TABLE wallets DROP CONSTRAINT IF EXISTS check_name_not_empty;
ALTER TABLE wallets ADD CONSTRAINT check_name_not_empty
CHECK (length(trim(name)) > 0);

-- Create index for wallet queries
CREATE INDEX IF NOT EXISTS idx_wallets_user_id
ON wallets(user_id);

CREATE INDEX IF NOT EXISTS idx_wallets_user_currency
ON wallets(user_id, currency);

-- Function to validate transaction currency matches wallet currency
CREATE OR REPLACE FUNCTION validate_transaction_wallet_currency()
RETURNS TRIGGER AS $$
BEGIN
    -- Only validate if wallet_id is provided
    IF NEW.wallet_id IS NOT NULL THEN
        -- Check if wallet exists and currency matches
        IF NOT EXISTS (
            SELECT 1 FROM wallets
            WHERE id = NEW.wallet_id
            AND user_id = NEW.user_id
            AND currency = NEW.currency
        ) THEN
            RAISE EXCEPTION 'Transaction currency must match wallet currency';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for currency validation
DROP TRIGGER IF EXISTS trigger_validate_transaction_wallet_currency ON transactions;
CREATE TRIGGER trigger_validate_transaction_wallet_currency
    BEFORE INSERT OR UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION validate_transaction_wallet_currency();

COMMENT ON FUNCTION validate_transaction_wallet_currency IS 'Ensures transaction currency matches wallet currency';

-- Add RLS policies for wallets if not exist
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own wallets" ON wallets;
DROP POLICY IF EXISTS "Users can create their own wallets" ON wallets;
DROP POLICY IF EXISTS "Users can update their own wallets" ON wallets;
DROP POLICY IF EXISTS "Users can delete their own wallets" ON wallets;

-- Create policies
CREATE POLICY "Users can view their own wallets"
    ON wallets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own wallets"
    ON wallets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallets"
    ON wallets FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wallets"
    ON wallets FOR DELETE
    USING (auth.uid() = user_id);

-- Add helpful comments
COMMENT ON TABLE wallets IS 'User financial accounts/wallets (bank accounts, cash, crypto wallets, etc.)';
COMMENT ON COLUMN wallets.provider IS 'Wallet provider (e.g., Mercado Pago, Ualá, Cash, Brubank, etc.)';
COMMENT ON COLUMN wallets.balance IS 'Initial or current balance in the wallet currency';
