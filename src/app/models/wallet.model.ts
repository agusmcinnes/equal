export interface Wallet {
  id?: string;
  user_id?: string;
  name: string;
  provider?: string;
  currency?: string;
  balance?: number;
  created_at?: string;
  updated_at?: string;
}
