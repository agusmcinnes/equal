Supabase SQL migrations and notes

Files in this folder:

- `sql/001_create_transactions_tables.sql` — Creates `categories`, `wallets`, `recurring_transactions`, and `transactions` tables, indexes and triggers.

How to apply:

1. Open your Supabase project -> SQL Editor.
2. Paste the contents of `sql/001_create_transactions_tables.sql` and run it.
3. Configure Row Level Security (RLS) policies for each table. A recommended simple policy:

   - Enable RLS for each table.
   - Allow authenticated users to operate on rows where `user_id = auth.uid()`.

Example policy (for `transactions` table):

```sql
-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Allow owners full access
CREATE POLICY "Allow logged in users to manage own transactions"
  ON public.transactions
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

Notes:
- The migration uses `gen_random_uuid()` which requires the `pgcrypto` extension.
- After applying migrations, test the API calls from the app to verify permissions.
