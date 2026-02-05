export interface QuickTransaction {
  id?: string;
  user_id?: string;
  name: string;                    // "Padel", "Almuerzo", etc.
  type: 'income' | 'expense';
  amount: number;
  currency: 'ARS' | 'USD' | 'EUR' | 'CRYPTO';
  crypto_type?: string | null;
  category_id?: string | null;     // Opcional
  wallet_id?: string | null;       // Opcional
  use_count?: number;              // Para ordenar por frecuencia
  created_at?: string;
  updated_at?: string;
}

export interface QuickTransactionWithDetails extends QuickTransaction {
  category_name?: string;
  category_color?: string;
  category_icon?: string;
  wallet_name?: string;
  wallet_provider?: string;
}
