-- =========================================================
-- 018_create_currency_exchanges.sql
-- Crea tabla para registrar cambios de moneda (USD/ARS)
-- =========================================================

-- Crear tabla currency_exchanges
-- Registra operaciones de cambio de moneda vinculadas a dos transacciones
CREATE TABLE IF NOT EXISTS currency_exchanges (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Tipo de operación
    operation_type text NOT NULL CHECK (operation_type IN ('buy_usd', 'sell_usd')),

    -- Información de la tasa de cambio
    exchange_rate numeric NOT NULL CHECK (exchange_rate > 0),
    rate_source text NOT NULL CHECK (rate_source IN ('blue', 'oficial', 'custom')),

    -- Montos y monedas
    source_amount numeric NOT NULL CHECK (source_amount > 0),
    source_currency varchar(8) NOT NULL,
    destination_amount numeric NOT NULL CHECK (destination_amount > 0),
    destination_currency varchar(8) NOT NULL,

    -- Referencias a transacciones creadas
    source_transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
    destination_transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,

    -- Referencias a wallets
    source_wallet_id uuid REFERENCES wallets(id) ON DELETE SET NULL,
    destination_wallet_id uuid REFERENCES wallets(id) ON DELETE SET NULL,

    -- Notas opcionales
    notes text,

    -- Timestamps
    executed_at timestamp with time zone DEFAULT NOW(),
    created_at timestamp with time zone DEFAULT NOW()
);

-- Índices para mejorar consultas
CREATE INDEX IF NOT EXISTS idx_currency_exchanges_user_id
    ON currency_exchanges(user_id);

CREATE INDEX IF NOT EXISTS idx_currency_exchanges_user_date
    ON currency_exchanges(user_id, executed_at DESC);

CREATE INDEX IF NOT EXISTS idx_currency_exchanges_operation
    ON currency_exchanges(user_id, operation_type);

CREATE INDEX IF NOT EXISTS idx_currency_exchanges_source_tx
    ON currency_exchanges(source_transaction_id)
    WHERE source_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_currency_exchanges_dest_tx
    ON currency_exchanges(destination_transaction_id)
    WHERE destination_transaction_id IS NOT NULL;

-- RLS: Enable Row Level Security
ALTER TABLE currency_exchanges ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own exchanges
DROP POLICY IF EXISTS "Users can view their own currency exchanges" ON currency_exchanges;
CREATE POLICY "Users can view their own currency exchanges"
    ON currency_exchanges
    FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policy: Users can create their own exchanges
DROP POLICY IF EXISTS "Users can create their own currency exchanges" ON currency_exchanges;
CREATE POLICY "Users can create their own currency exchanges"
    ON currency_exchanges
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own exchanges
DROP POLICY IF EXISTS "Users can update their own currency exchanges" ON currency_exchanges;
CREATE POLICY "Users can update their own currency exchanges"
    ON currency_exchanges
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own exchanges
DROP POLICY IF EXISTS "Users can delete their own currency exchanges" ON currency_exchanges;
CREATE POLICY "Users can delete their own currency exchanges"
    ON currency_exchanges
    FOR DELETE
    USING (auth.uid() = user_id);

-- Vista: currency_exchanges_with_details
-- Incluye información de wallets y transacciones relacionadas
CREATE OR REPLACE VIEW currency_exchanges_with_details AS
SELECT
    ce.*,
    sw.name as source_wallet_name,
    sw.provider as source_wallet_provider,
    dw.name as destination_wallet_name,
    dw.provider as destination_wallet_provider
FROM currency_exchanges ce
LEFT JOIN wallets sw ON ce.source_wallet_id = sw.id
LEFT JOIN wallets dw ON ce.destination_wallet_id = dw.id;

-- Vista: user_exchange_summary
-- Resumen de operaciones de cambio por usuario
CREATE OR REPLACE VIEW user_exchange_summary AS
SELECT
    user_id,
    operation_type,
    COUNT(*) as exchange_count,
    SUM(source_amount) as total_source_amount,
    SUM(destination_amount) as total_destination_amount,
    AVG(exchange_rate) as avg_exchange_rate,
    MAX(executed_at) as last_exchange_date
FROM currency_exchanges
GROUP BY user_id, operation_type;

-- Comentarios de documentación
COMMENT ON TABLE currency_exchanges IS 'Registro de operaciones de cambio de moneda (compra/venta USD)';
COMMENT ON COLUMN currency_exchanges.operation_type IS 'Tipo de operación: buy_usd (comprar dólares) o sell_usd (vender dólares)';
COMMENT ON COLUMN currency_exchanges.exchange_rate IS 'Tasa de cambio utilizada en la operación';
COMMENT ON COLUMN currency_exchanges.rate_source IS 'Fuente de la tasa: blue, oficial, o custom';
COMMENT ON COLUMN currency_exchanges.source_transaction_id IS 'ID de la transacción de salida (expense)';
COMMENT ON COLUMN currency_exchanges.destination_transaction_id IS 'ID de la transacción de entrada (income)';
