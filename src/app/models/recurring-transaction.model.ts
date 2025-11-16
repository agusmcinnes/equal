export interface RecurringTransaction {
  id?: string;
  user_id?: string;
  description: string;
  category_id?: string | null;
  amount: number;
  currency?: string;
  wallet_id?: string | null;
  type: 'income' | 'expense';
  cadence: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  next_date: string; // ISO date
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Recurring transaction with expanded data
export interface RecurringTransactionWithDetails extends RecurringTransaction {
  category_name?: string;
  category_color?: string;
  category_icon?: string;
  wallet_name?: string;
  wallet_provider?: string;
}

// Cadence options for UI
export const RECURRING_CADENCES = [
  { value: 'daily', label: 'Diario', icon: 'today' },
  { value: 'weekly', label: 'Semanal', icon: 'date_range' },
  { value: 'biweekly', label: 'Quincenal', icon: 'event_repeat' },
  { value: 'monthly', label: 'Mensual', icon: 'calendar_month' },
  { value: 'quarterly', label: 'Trimestral', icon: 'calendar_today' },
  { value: 'yearly', label: 'Anual', icon: 'event' }
] as const;
