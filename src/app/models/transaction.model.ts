export interface Transaction {
  id?: string;
  user_id?: string;
  date: string; // ISO timestamp
  description?: string;
  category_id?: string | null;
  amount: number;
  currency?: string;
  crypto_type?: string | null;
  wallet_id?: string | null;
  type: 'income' | 'expense';
  is_recurring?: boolean;
  recurring_id?: string | null;
  created_at?: string;
  updated_at?: string;
}
