-- =========================================================
-- 007_create_scheduled_transactions.sql
-- Crea tabla para gastos/ingresos fijos (Scheduled Transactions)
-- =========================================================

-- Crear tabla scheduled_transactions
-- Representa transacciones programadas (gastos/ingresos fijos) con fecha de inicio y fin opcional
CREATE TABLE IF NOT EXISTS scheduled_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    description text NOT NULL,
    category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
    amount numeric NOT NULL CHECK (amount > 0),
    currency character varying NOT NULL CHECK (currency IN ('ARS', 'USD', 'EUR', 'CRYPTO')),
    wallet_id uuid REFERENCES wallets(id) ON DELETE SET NULL,
    type text NOT NULL CHECK (type IN ('income', 'expense')),
    crypto_type character varying,
    
    -- Campos de planificación
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone,
    frequency text NOT NULL CHECK (frequency IN ('daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'bi-annual', 'yearly')),
    
    -- Últimas fechas de ejecución
    last_execution_date timestamp with time zone,
    next_execution_date timestamp with time zone NOT NULL,
    
    -- Estado
    is_active boolean NOT NULL DEFAULT true,
    
    -- Timestamps
    created_at timestamp with time zone NOT NULL DEFAULT NOW(),
    updated_at timestamp with time zone NOT NULL DEFAULT NOW()
);

-- Índices en scheduled_transactions
CREATE INDEX IF NOT EXISTS idx_scheduled_user_id ON scheduled_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_user_type ON scheduled_transactions(user_id, type);
CREATE INDEX IF NOT EXISTS idx_scheduled_user_currency ON scheduled_transactions(user_id, currency);
CREATE INDEX IF NOT EXISTS idx_scheduled_category ON scheduled_transactions(user_id, category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scheduled_wallet ON scheduled_transactions(user_id, wallet_id) WHERE wallet_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scheduled_active_next_date ON scheduled_transactions(user_id, is_active, next_execution_date) WHERE is_active = true;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS trg_scheduled_transactions_updated_at ON scheduled_transactions;
CREATE TRIGGER trg_scheduled_transactions_updated_at
BEFORE UPDATE ON scheduled_transactions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Vista: scheduled_transactions_with_details
-- Incluye información de categoría y billetera
CREATE OR REPLACE VIEW scheduled_transactions_with_details AS
SELECT 
    st.*,
    c.name as category_name,
    c.color as category_color,
    c.icon as category_icon,
    c.type as category_type,
    w.name as wallet_name,
    w.provider as wallet_provider
FROM scheduled_transactions st
LEFT JOIN categories c ON st.category_id = c.id
LEFT JOIN wallets w ON st.wallet_id = w.id;

-- Vista: pending_scheduled_transactions
-- Transacciones programadas que deben ejecutarse hoy
CREATE OR REPLACE VIEW pending_scheduled_transactions AS
SELECT 
    st.*,
    c.name as category_name,
    c.color as category_color,
    c.icon as category_icon,
    c.type as category_type,
    w.name as wallet_name,
    w.provider as wallet_provider
FROM scheduled_transactions st
LEFT JOIN categories c ON st.category_id = c.id
LEFT JOIN wallets w ON st.wallet_id = w.id
WHERE st.is_active = true
    AND st.next_execution_date <= NOW()
    AND (st.end_date IS NULL OR st.end_date >= NOW());

-- Vista: active_scheduled_by_type
-- Transacciones programadas activas agrupadas por tipo
CREATE OR REPLACE VIEW active_scheduled_by_type AS
SELECT 
    user_id,
    type,
    currency,
    COUNT(*) as count,
    SUM(amount) as total_amount,
    AVG(amount) as avg_amount
FROM scheduled_transactions
WHERE is_active = true
GROUP BY user_id, type, currency;

-- RLS: Enable RLS
ALTER TABLE scheduled_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can view their own scheduled transactions
DROP POLICY IF EXISTS "Users can view their own scheduled transactions" ON scheduled_transactions;
CREATE POLICY "Users can view their own scheduled transactions"
    ON scheduled_transactions
    FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policy: Users can create their own scheduled transactions
DROP POLICY IF EXISTS "Users can create their own scheduled transactions" ON scheduled_transactions;
CREATE POLICY "Users can create their own scheduled transactions"
    ON scheduled_transactions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own scheduled transactions
DROP POLICY IF EXISTS "Users can update their own scheduled transactions" ON scheduled_transactions;
CREATE POLICY "Users can update their own scheduled transactions"
    ON scheduled_transactions
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own scheduled transactions
DROP POLICY IF EXISTS "Users can delete their own scheduled transactions" ON scheduled_transactions;
CREATE POLICY "Users can delete their own scheduled transactions"
    ON scheduled_transactions
    FOR DELETE
    USING (auth.uid() = user_id);

-- Función para calcular próxima fecha de ejecución basada en frecuencia
CREATE OR REPLACE FUNCTION calculate_next_execution_date(
    execution_date timestamp with time zone,
    frequency text
) RETURNS timestamp with time zone AS $$
BEGIN
    CASE frequency
        WHEN 'daily' THEN
            RETURN execution_date + INTERVAL '1 day';
        WHEN 'weekly' THEN
            RETURN execution_date + INTERVAL '7 days';
        WHEN 'bi-weekly' THEN
            RETURN execution_date + INTERVAL '14 days';
        WHEN 'monthly' THEN
            RETURN execution_date + INTERVAL '1 month';
        WHEN 'quarterly' THEN
            RETURN execution_date + INTERVAL '3 months';
        WHEN 'bi-annual' THEN
            RETURN execution_date + INTERVAL '6 months';
        WHEN 'yearly' THEN
            RETURN execution_date + INTERVAL '1 year';
        ELSE
            RETURN execution_date + INTERVAL '1 month';
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Validación de wallet currency (similar a transactions)
CREATE OR REPLACE FUNCTION validate_scheduled_wallet_currency()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.wallet_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM wallets
            WHERE id = NEW.wallet_id
            AND user_id = NEW.user_id
            AND currency = NEW.currency
        ) THEN
            RAISE EXCEPTION 'Scheduled transaction currency must match wallet currency';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar wallet currency
DROP TRIGGER IF EXISTS trigger_validate_scheduled_wallet_currency ON scheduled_transactions;
CREATE TRIGGER trigger_validate_scheduled_wallet_currency
BEFORE INSERT OR UPDATE ON scheduled_transactions
FOR EACH ROW
EXECUTE FUNCTION validate_scheduled_wallet_currency();

-- Comentarios de documentación
COMMENT ON TABLE scheduled_transactions IS 'Transacciones programadas (gastos/ingresos fijos) que se ejecutan automáticamente según su frecuencia';
COMMENT ON COLUMN scheduled_transactions.frequency IS 'Frecuencia de repetición: daily, weekly, bi-weekly, monthly, quarterly, bi-annual, yearly';
COMMENT ON COLUMN scheduled_transactions.is_active IS 'Indica si la transacción programada está activa';
COMMENT ON COLUMN scheduled_transactions.next_execution_date IS 'Próxima fecha en la que se ejecutará la transacción';
COMMENT ON COLUMN scheduled_transactions.last_execution_date IS 'Última fecha en la que se ejecutó la transacción';

-- Insertar datos de ejemplo (comentado)
-- INSERT INTO scheduled_transactions 
-- (user_id, description, category_id, amount, currency, wallet_id, type, start_date, frequency, next_execution_date, is_active)
-- VALUES 
-- ('550e8400-e29b-41d4-a716-446655440000', 'Sueldo', 'category_id', 50000, 'ARS', 'wallet_id', 'income', NOW(), 'monthly', NOW(), true);
