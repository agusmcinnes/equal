// Scheduled transaction model (Gastos/Ingresos Fijos)
export interface ScheduledTransaction {
  id?: string;
  user_id?: string;
  description: string;
  category_id?: string | null;
  amount: number;
  currency: string;
  crypto_type?: string | null;
  wallet_id?: string | null;
  type: 'income' | 'expense';
  
  // Scheduling fields
  start_date: string; // ISO timestamp
  end_date?: string | null; // ISO timestamp
  frequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'bi-annual' | 'yearly';
  
  // Execution tracking
  last_execution_date?: string | null;
  next_execution_date: string; // ISO timestamp
  
  // Status
  is_active: boolean;
  
  // Timestamps
  created_at?: string;
  updated_at?: string;
}

// Scheduled transaction with expanded related data
export interface ScheduledTransactionWithDetails extends ScheduledTransaction {
  category_name?: string;
  category_color?: string;
  category_icon?: string;
  category_type?: string;
  wallet_name?: string;
  wallet_provider?: string;
  accrued_real?: number;
  executed_count?: number;
  executed_last_date?: string | null;
}

// Filters for scheduled transactions
export interface ScheduledTransactionFilters {
  type?: 'income' | 'expense' | 'all';
  category_ids?: string[];
  wallet_ids?: string[];
  currency?: string;
  is_active?: boolean;
  frequency?: string[];
}

// Frequency options
export const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Diariamente' },
  { value: 'weekly', label: 'Semanalmente' },
  { value: 'bi-weekly', label: 'Cada 2 semanas' },
  { value: 'monthly', label: 'Mensualmente' },
  { value: 'quarterly', label: 'Trimestralmente' },
  { value: 'bi-annual', label: 'Semestralmente' },
  { value: 'yearly', label: 'Anualmente' }
];

// Summary statistics for scheduled transactions
export interface ScheduledTransactionStatistics {
  total_income: number;
  total_expenses: number;
  total_income_monthly_projection: number;
  total_expenses_monthly_projection: number;
  currency: string;
  income_count: number;
  expense_count: number;
}
