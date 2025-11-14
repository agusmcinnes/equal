-- Add crypto_type column to transactions and a default_categories table with seeds

-- Add column for crypto type (nullable)
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS crypto_type varchar(16);

-- Default categories (global templates)
CREATE TABLE IF NOT EXISTS public.default_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('income','expense')),
  color varchar(32),
  icon varchar(128),
  created_at timestamptz DEFAULT now()
);

-- Seed some common categories
INSERT INTO public.default_categories (name, type, color, icon)
VALUES
  ('Salario','income','#16a34a','work'),
  ('Freelance','income','#10b981','laptop_mac'),
  ('Alimentos','expense','#ef4444','local_dining'),
  ('Transporte','expense','#f59e0b','directions_car'),
  ('Hogar','expense','#3b82f6','home'),
  ('Salud','expense','#ef476f','medical_services')
ON CONFLICT DO NOTHING;
