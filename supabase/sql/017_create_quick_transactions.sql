-- =========================================================
-- 017_create_quick_transactions.sql
-- Crea tabla para plantillas de transacciones rápidas
-- =========================================================

-- Crear tabla quick_transactions
-- Plantillas de transacciones frecuentes para ejecución rápida
CREATE TABLE IF NOT EXISTS quick_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    type text NOT NULL CHECK (type IN ('income', 'expense')),
    amount numeric NOT NULL CHECK (amount > 0),
    currency character varying NOT NULL CHECK (currency IN ('ARS', 'USD', 'EUR', 'CRYPTO')),
    crypto_type character varying,
    category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
    wallet_id uuid REFERENCES wallets(id) ON DELETE SET NULL,
    use_count integer NOT NULL DEFAULT 0,

    -- Timestamps
    created_at timestamp with time zone NOT NULL DEFAULT NOW(),
    updated_at timestamp with time zone NOT NULL DEFAULT NOW()
);

-- Índices en quick_transactions
CREATE INDEX IF NOT EXISTS idx_quick_transactions_user_id ON quick_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_quick_transactions_user_use_count ON quick_transactions(user_id, use_count DESC);
CREATE INDEX IF NOT EXISTS idx_quick_transactions_category ON quick_transactions(user_id, category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quick_transactions_wallet ON quick_transactions(user_id, wallet_id) WHERE wallet_id IS NOT NULL;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS trg_quick_transactions_updated_at ON quick_transactions;
CREATE TRIGGER trg_quick_transactions_updated_at
BEFORE UPDATE ON quick_transactions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Vista: quick_transactions_with_details
-- Incluye información de categoría y billetera
CREATE OR REPLACE VIEW quick_transactions_with_details AS
SELECT
    qt.*,
    c.name as category_name,
    c.color as category_color,
    c.icon as category_icon,
    w.name as wallet_name,
    w.provider as wallet_provider
FROM quick_transactions qt
LEFT JOIN categories c ON qt.category_id = c.id
LEFT JOIN wallets w ON qt.wallet_id = w.id;

-- RLS: Enable RLS
ALTER TABLE quick_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can view their own quick transactions
DROP POLICY IF EXISTS "Users can view their own quick transactions" ON quick_transactions;
CREATE POLICY "Users can view their own quick transactions"
    ON quick_transactions
    FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policy: Users can create their own quick transactions
DROP POLICY IF EXISTS "Users can create their own quick transactions" ON quick_transactions;
CREATE POLICY "Users can create their own quick transactions"
    ON quick_transactions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own quick transactions
DROP POLICY IF EXISTS "Users can update their own quick transactions" ON quick_transactions;
CREATE POLICY "Users can update their own quick transactions"
    ON quick_transactions
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own quick transactions
DROP POLICY IF EXISTS "Users can delete their own quick transactions" ON quick_transactions;
CREATE POLICY "Users can delete their own quick transactions"
    ON quick_transactions
    FOR DELETE
    USING (auth.uid() = user_id);

-- Validación de wallet currency
CREATE OR REPLACE FUNCTION validate_quick_transaction_wallet_currency()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.wallet_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM wallets
            WHERE id = NEW.wallet_id
            AND user_id = NEW.user_id
            AND currency = NEW.currency
        ) THEN
            RAISE EXCEPTION 'Quick transaction currency must match wallet currency';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar wallet currency
DROP TRIGGER IF EXISTS trigger_validate_quick_transaction_wallet_currency ON quick_transactions;
CREATE TRIGGER trigger_validate_quick_transaction_wallet_currency
BEFORE INSERT OR UPDATE ON quick_transactions
FOR EACH ROW
EXECUTE FUNCTION validate_quick_transaction_wallet_currency();

-- Comentarios de documentación
COMMENT ON TABLE quick_transactions IS 'Plantillas de transacciones frecuentes para ejecución rápida';
COMMENT ON COLUMN quick_transactions.name IS 'Nombre descriptivo de la plantilla (ej: "Padel", "Almuerzo")';
COMMENT ON COLUMN quick_transactions.use_count IS 'Contador de uso para ordenar por frecuencia';
