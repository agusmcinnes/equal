-- Supabase migration: create categories, wallets, transactions, recurring_transactions
-- Run this in your Supabase SQL editor or via psql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Categories table (user-defined categories)
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('income','expense')),
  color varchar(32),
  icon varchar(128),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);

-- Wallets table (user wallets: MP, Ualá, Cash, etc.)
CREATE TABLE IF NOT EXISTS public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  provider text,
  currency varchar(8) DEFAULT 'ARS',
  balance numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);

-- Recurring transactions template
CREATE TABLE IF NOT EXISTS public.recurring_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description text,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  currency varchar(8) DEFAULT 'ARS',
  wallet_id uuid REFERENCES public.wallets(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('income','expense')),
  cadence text NOT NULL, -- e.g., 'monthly','weekly'
  next_date date,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recurring_user_id ON public.recurring_transactions(user_id);

-- Transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date timestamptz NOT NULL DEFAULT now(),
  description text,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  currency varchar(8) DEFAULT 'ARS',
  wallet_id uuid REFERENCES public.wallets(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('income','expense')),
  is_recurring boolean DEFAULT false,
  recurring_id uuid REFERENCES public.recurring_transactions(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON public.transactions(user_id, type);

-- Trigger to update updated_at on row modification
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_wallets_updated_at
BEFORE UPDATE ON public.wallets
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_recurring_updated_at
BEFORE UPDATE ON public.recurring_transactions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- NOTE: Configure Row Level Security (RLS) policies in Supabase console for these tables
