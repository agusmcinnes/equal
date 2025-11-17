-- Configure Row Level Security (RLS) policies for transactions, categories, and recurring_transactions
-- This was missing from the initial setup and is required for proper data access

-- Enable RLS on transactions table
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on categories table
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Enable RLS on recurring_transactions table
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;

-- ===== TRANSACTIONS POLICIES =====

-- Policy: Users can view their own transactions
CREATE POLICY "Users can view their own transactions"
ON public.transactions
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own transactions
CREATE POLICY "Users can insert their own transactions"
ON public.transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own transactions
CREATE POLICY "Users can update their own transactions"
ON public.transactions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own transactions
CREATE POLICY "Users can delete their own transactions"
ON public.transactions
FOR DELETE
USING (auth.uid() = user_id);

-- ===== CATEGORIES POLICIES =====

-- Policy: Users can view their own categories
CREATE POLICY "Users can view their own categories"
ON public.categories
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own categories
CREATE POLICY "Users can insert their own categories"
ON public.categories
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own categories
CREATE POLICY "Users can update their own categories"
ON public.categories
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own categories
CREATE POLICY "Users can delete their own categories"
ON public.categories
FOR DELETE
USING (auth.uid() = user_id);

-- ===== RECURRING TRANSACTIONS POLICIES =====

-- Policy: Users can view their own recurring transactions
CREATE POLICY "Users can view their own recurring transactions"
ON public.recurring_transactions
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own recurring transactions
CREATE POLICY "Users can insert their own recurring transactions"
ON public.recurring_transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own recurring transactions
CREATE POLICY "Users can update their own recurring transactions"
ON public.recurring_transactions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own recurring transactions
CREATE POLICY "Users can delete their own recurring transactions"
ON public.recurring_transactions
FOR DELETE
USING (auth.uid() = user_id);

-- ===== DEFAULT CATEGORIES POLICIES =====
-- default_categories should be readable by everyone but only writable by admins

ALTER TABLE public.default_categories ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view default categories
CREATE POLICY "Everyone can view default categories"
ON public.default_categories
FOR SELECT
TO authenticated
USING (true);

-- Note: Only superusers can insert/update/delete default_categories
-- No additional policies needed for writes

COMMENT ON TABLE public.transactions IS 'User transactions with RLS enabled';
COMMENT ON TABLE public.categories IS 'User categories with RLS enabled';
COMMENT ON TABLE public.recurring_transactions IS 'User recurring transactions with RLS enabled';
COMMENT ON TABLE public.default_categories IS 'Global default categories readable by all authenticated users';
