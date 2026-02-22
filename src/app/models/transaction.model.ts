import { Category } from './category.model';
import { Wallet } from './wallet.model';

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
  type: 'income' | 'expense' | 'exchange';
  is_recurring?: boolean;
  recurring_id?: string | null;
  goal_id?: string | null; // Link to goal if this transaction is from a goal movement
  created_at?: string;
  updated_at?: string;
}

// Transaction with expanded related data (from transactions_with_details view)
export interface TransactionWithDetails extends Transaction {
  category_name?: string;
  category_color?: string;
  category_icon?: string;
  category_type?: string;
  wallet_name?: string;
  wallet_provider?: string;
}

// Transaction filters interface
export interface TransactionFilters {
  type?: 'income' | 'expense' | 'exchange' | 'all';
  category_ids?: string[];
  wallet_ids?: string[];
  currency?: string;
  search?: string;
  from?: string; // ISO date
  to?: string; // ISO date
  is_recurring?: boolean;
}

// Transaction statistics
export interface TransactionStatistics {
  total_income: number;
  total_expenses: number;
  net_balance: number;
  transaction_count: number;
  income_count: number;
  expense_count: number;
  currency: string;
  avg_income?: number;
  avg_expense?: number;
}

// Category distribution for charts
export interface CategoryDistribution {
  category_id: string;
  category_name: string;
  category_color: string;
  category_icon: string;
  transaction_count: number;
  total_amount: number;
  percentage: number;
}

// Monthly trend data for charts
export interface MonthlyTrend {
  month: string; // YYYY-MM format
  month_label: string; // e.g., "Nov 2025"
  income: number;
  expenses: number;
  net: number;
  transaction_count: number;
}

// Daily data for line charts
export interface DailyData {
  date: string; // YYYY-MM-DD format
  income: number;
  expenses: number;
  net: number;
}

// Transaction sort options
export type TransactionSortField = 'date' | 'amount' | 'description' | 'category' | 'wallet';
export type TransactionSortOrder = 'asc' | 'desc';

export interface TransactionSort {
  field: TransactionSortField;
  order: TransactionSortOrder;
}

// Pagination
export interface TransactionPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// Complete transaction query result
export interface TransactionQueryResult {
  transactions: TransactionWithDetails[];
  pagination: TransactionPagination;
  statistics: TransactionStatistics;
}
