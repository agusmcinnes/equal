-- Migration: Sample data for development and testing
-- Description: Insert sample wallets and transactions for testing the UI
-- Created: 2025-11-15
-- WARNING: This should ONLY be run in development environments

-- NOTE: Replace 'YOUR_USER_ID' with an actual user ID from your auth.users table
-- You can get this by running: SELECT id FROM auth.users LIMIT 1;

-- This script is commented out by default for safety
-- Uncomment and modify the user_id before running

/*
-- Sample Wallets
INSERT INTO wallets (user_id, name, provider, currency, balance) VALUES
('YOUR_USER_ID', 'Mercado Pago', 'Mercado Pago', 'ARS', 150000.00),
('YOUR_USER_ID', 'Ualá', 'Ualá', 'ARS', 85000.00),
('YOUR_USER_ID', 'Efectivo', 'Cash', 'ARS', 25000.00),
('YOUR_USER_ID', 'Cuenta Dólares', 'Banco', 'USD', 500.00),
('YOUR_USER_ID', 'Binance', 'Binance', 'CRYPTO', 0.05)
ON CONFLICT DO NOTHING;

-- Get wallet IDs (you'll need to adjust these queries based on your actual wallet IDs)
-- Sample Transactions for the last 3 months
DO $$
DECLARE
    v_user_id uuid := 'YOUR_USER_ID';
    v_wallet_mp uuid;
    v_wallet_uala uuid;
    v_wallet_cash uuid;
    v_wallet_usd uuid;
    v_cat_salary uuid;
    v_cat_freelance uuid;
    v_cat_food uuid;
    v_cat_transport uuid;
    v_cat_home uuid;
    v_cat_health uuid;
BEGIN
    -- Get wallet IDs
    SELECT id INTO v_wallet_mp FROM wallets WHERE user_id = v_user_id AND provider = 'Mercado Pago';
    SELECT id INTO v_wallet_uala FROM wallets WHERE user_id = v_user_id AND provider = 'Ualá';
    SELECT id INTO v_wallet_cash FROM wallets WHERE user_id = v_user_id AND provider = 'Cash';
    SELECT id INTO v_wallet_usd FROM wallets WHERE user_id = v_user_id AND currency = 'USD';

    -- Get category IDs
    SELECT id INTO v_cat_salary FROM categories WHERE user_id = v_user_id AND name = 'Salario';
    SELECT id INTO v_cat_freelance FROM categories WHERE user_id = v_user_id AND name = 'Freelance';
    SELECT id INTO v_cat_food FROM categories WHERE user_id = v_user_id AND name = 'Alimentos';
    SELECT id INTO v_cat_transport FROM categories WHERE user_id = v_user_id AND name = 'Transporte';
    SELECT id INTO v_cat_home FROM categories WHERE user_id = v_user_id AND name = 'Hogar';
    SELECT id INTO v_cat_health FROM categories WHERE user_id = v_user_id AND name = 'Salud';

    -- Income transactions
    INSERT INTO transactions (user_id, date, description, category_id, amount, currency, wallet_id, type) VALUES
    (v_user_id, NOW() - INTERVAL '1 day', 'Salario Octubre', v_cat_salary, 450000, 'ARS', v_wallet_mp, 'income'),
    (v_user_id, NOW() - INTERVAL '5 days', 'Proyecto Freelance - Diseño Web', v_cat_freelance, 85000, 'ARS', v_wallet_uala, 'income'),
    (v_user_id, NOW() - INTERVAL '15 days', 'Consultoría IT', v_cat_freelance, 120000, 'ARS', v_wallet_mp, 'income'),
    (v_user_id, NOW() - INTERVAL '32 days', 'Salario Septiembre', v_cat_salary, 450000, 'ARS', v_wallet_mp, 'income'),
    (v_user_id, NOW() - INTERVAL '45 days', 'Proyecto Freelance - App Móvil', v_cat_freelance, 200000, 'ARS', v_wallet_uala, 'income'),
    (v_user_id, NOW() - INTERVAL '63 days', 'Salario Agosto', v_cat_salary, 430000, 'ARS', v_wallet_mp, 'income');

    -- Expense transactions - Food
    INSERT INTO transactions (user_id, date, description, category_id, amount, currency, wallet_id, type) VALUES
    (v_user_id, NOW() - INTERVAL '1 hour', 'Supermercado Día', v_cat_food, 15800, 'ARS', v_wallet_uala, 'expense'),
    (v_user_id, NOW() - INTERVAL '2 days', 'Almuerzo - Restaurant', v_cat_food, 8500, 'ARS', v_wallet_cash, 'expense'),
    (v_user_id, NOW() - INTERVAL '3 days', 'Verdulería', v_cat_food, 4200, 'ARS', v_wallet_cash, 'expense'),
    (v_user_id, NOW() - INTERVAL '5 days', 'Carnicería', v_cat_food, 12300, 'ARS', v_wallet_uala, 'expense'),
    (v_user_id, NOW() - INTERVAL '7 days', 'Supermercado Carrefour', v_cat_food, 25600, 'ARS', v_wallet_mp, 'expense'),
    (v_user_id, NOW() - INTERVAL '10 days', 'Café con amigos', v_cat_food, 5400, 'ARS', v_wallet_cash, 'expense'),
    (v_user_id, NOW() - INTERVAL '14 days', 'Pedido Rappi', v_cat_food, 9800, 'ARS', v_wallet_mp, 'expense'),
    (v_user_id, NOW() - INTERVAL '20 days', 'Supermercado Coto', v_cat_food, 32000, 'ARS', v_wallet_uala, 'expense');

    -- Expense transactions - Transport
    INSERT INTO transactions (user_id, date, description, category_id, amount, currency, wallet_id, type) VALUES
    (v_user_id, NOW() - INTERVAL '1 day', 'Carga SUBE', v_cat_transport, 5000, 'ARS', v_wallet_mp, 'expense'),
    (v_user_id, NOW() - INTERVAL '4 days', 'Uber al centro', v_cat_transport, 2800, 'ARS', v_wallet_mp, 'expense'),
    (v_user_id, NOW() - INTERVAL '8 days', 'Combustible', v_cat_transport, 18000, 'ARS', v_wallet_uala, 'expense'),
    (v_user_id, NOW() - INTERVAL '16 days', 'Carga SUBE', v_cat_transport, 5000, 'ARS', v_wallet_mp, 'expense'),
    (v_user_id, NOW() - INTERVAL '25 days', 'Peaje autopista', v_cat_transport, 1500, 'ARS', v_wallet_cash, 'expense');

    -- Expense transactions - Home
    INSERT INTO transactions (user_id, date, description, category_id, amount, currency, wallet_id, type) VALUES
    (v_user_id, NOW() - INTERVAL '3 days', 'Alquiler Noviembre', v_cat_home, 95000, 'ARS', v_wallet_mp, 'expense'),
    (v_user_id, NOW() - INTERVAL '6 days', 'Luz y Gas', v_cat_home, 12500, 'ARS', v_wallet_uala, 'expense'),
    (v_user_id, NOW() - INTERVAL '12 days', 'Internet Fibra', v_cat_home, 8900, 'ARS', v_wallet_mp, 'expense'),
    (v_user_id, NOW() - INTERVAL '18 days', 'Expensas', v_cat_home, 25000, 'ARS', v_wallet_mp, 'expense'),
    (v_user_id, NOW() - INTERVAL '34 days', 'Alquiler Octubre', v_cat_home, 95000, 'ARS', v_wallet_mp, 'expense'),
    (v_user_id, NOW() - INTERVAL '40 days', 'Agua', v_cat_home, 3200, 'ARS', v_wallet_uala, 'expense');

    -- Expense transactions - Health
    INSERT INTO transactions (user_id, date, description, category_id, amount, currency, wallet_id, type) VALUES
    (v_user_id, NOW() - INTERVAL '9 days', 'Farmacia - Medicamentos', v_cat_health, 8700, 'ARS', v_wallet_uala, 'expense'),
    (v_user_id, NOW() - INTERVAL '22 days', 'Consulta médica', v_cat_health, 15000, 'ARS', v_wallet_mp, 'expense'),
    (v_user_id, NOW() - INTERVAL '50 days', 'Odontólogo', v_cat_health, 12000, 'ARS', v_wallet_mp, 'expense');

    -- USD transactions
    INSERT INTO transactions (user_id, date, description, category_id, amount, currency, wallet_id, type) VALUES
    (v_user_id, NOW() - INTERVAL '10 days', 'Retiro dólares para ahorro', v_cat_salary, 100, 'USD', v_wallet_usd, 'income'),
    (v_user_id, NOW() - INTERVAL '28 days', 'Compra USD', v_cat_salary, 200, 'USD', v_wallet_usd, 'income');

END $$;
*/

-- Instructions:
-- 1. Get your user_id: SELECT id FROM auth.users WHERE email = 'your-email@example.com';
-- 2. Replace all instances of 'YOUR_USER_ID' with your actual user ID
-- 3. Uncomment the entire block
-- 4. Run this script in your Supabase SQL editor
-- 5. Verify data: SELECT COUNT(*) FROM transactions WHERE user_id = 'YOUR_USER_ID';
