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

// Wallet with calculated current balance (from wallet_current_balance view)
export interface WalletWithBalance extends Wallet {
  initial_balance: number;
  transaction_total: number;
  current_balance: number;
  transaction_count: number;
}

// Wallet summary for display
export interface WalletSummary {
  wallet_id: string;
  wallet_name: string;
  wallet_provider: string;
  currency: string;
  balance: number;
  icon?: string; // Optional icon based on provider
}

// Common wallet providers
export const WALLET_PROVIDERS = [
  { name: 'Mercado Pago', icon: 'account_balance_wallet' },
  { name: 'Ualá', icon: 'credit_card' },
  { name: 'Cash', icon: 'payments' },
  { name: 'Brubank', icon: 'account_balance' },
  { name: 'Banco', icon: 'account_balance' },
  { name: 'Binance', icon: 'currency_bitcoin' },
  { name: 'Otro', icon: 'wallet' }
] as const;
