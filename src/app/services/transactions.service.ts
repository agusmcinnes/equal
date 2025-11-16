import { Injectable } from '@angular/core';
import { SupabaseService } from '../core/supabase.service';
import {
  Transaction,
  TransactionWithDetails,
  TransactionFilters,
  TransactionStatistics,
  CategoryDistribution,
  MonthlyTrend,
  DailyData,
  TransactionQueryResult,
  TransactionSort
} from '../models/transaction.model';
import { AuthService } from './auth.service';
import { from, Observable, map, catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TransactionsService {
  constructor(
    private supabase: SupabaseService,
    private auth: AuthService
  ) {}

  private userId(): string | null {
    return this.auth.currentUserValue ? this.auth.currentUserValue.id : null;
  }

  /**
   * Legacy method - kept for backwards compatibility
   */
  async list(filter: { type?: string; category_id?: string; from?: string; to?: string } = {}) {
    const user_id = this.userId();
    if (!user_id) return { data: [], error: 'not_authenticated' };

    let query = this.supabase.client.from('transactions').select('*').eq('user_id', user_id).order('date', { ascending: false });

    if (filter.type) query = query.eq('type', filter.type);
    if (filter.category_id) query = query.eq('category_id', filter.category_id);
    if (filter.from) query = query.gte('date', filter.from);
    if (filter.to) query = query.lte('date', filter.to);

    const { data, error } = await query;
    return { data, error };
  }

  /**
   * Get transactions with expanded details (category, wallet)
   */
  listWithDetails(filters?: TransactionFilters, sort?: TransactionSort): Observable<TransactionWithDetails[]> {
    const user_id = this.userId();
    if (!user_id) return of([]);

    let query = this.supabase.client
      .from('transactions_with_details')
      .select('*')
      .eq('user_id', user_id);

    // Apply filters
    if (filters) {
      if (filters.type && filters.type !== 'all') {
        query = query.eq('type', filters.type);
      }
      if (filters.category_ids && filters.category_ids.length > 0) {
        query = query.in('category_id', filters.category_ids);
      }
      if (filters.wallet_ids && filters.wallet_ids.length > 0) {
        query = query.in('wallet_id', filters.wallet_ids);
      }
      if (filters.currency) {
        query = query.eq('currency', filters.currency);
      }
      if (filters.from) {
        query = query.gte('date', filters.from);
      }
      if (filters.to) {
        query = query.lte('date', filters.to);
      }
      if (filters.is_recurring !== undefined) {
        query = query.eq('is_recurring', filters.is_recurring);
      }
      if (filters.search) {
        query = query.ilike('description', `%${filters.search}%`);
      }
    }

    // Apply sorting
    const sortField = sort?.field || 'date';
    const sortOrder = sort?.order === 'asc';
    query = query.order(sortField, { ascending: sortOrder });

    return from(query).pipe(
      map((response) => {
        if (response.error) throw response.error;
        return response.data || [];
      }),
      catchError((error) => {
        console.error('Error fetching transactions:', error);
        return of([]);
      })
    );
  }

  /**
   * Get transaction by ID
   */
  async getById(id: string) {
    const user_id = this.userId();
    if (!user_id) return { data: null, error: 'not_authenticated' };
    const { data, error } = await this.supabase.client.from('transactions').select('*').eq('id', id).eq('user_id', user_id).single();
    return { data, error };
  }

  /**
   * Create transaction
   */
  async create(tx: Transaction) {
    const user_id = this.userId();
    if (!user_id) return { data: null, error: 'not_authenticated' };
    tx.user_id = user_id;
    const { data, error } = await this.supabase.client
      .from('transactions')
      .insert([tx])
      .select();
    return { data, error };
  }

  /**
   * Update transaction
   */
  async update(id: string, tx: Partial<Transaction>) {
    const user_id = this.userId();
    if (!user_id) return { data: null, error: 'not_authenticated' };
    const { data, error } = await this.supabase.client
      .from('transactions')
      .update(tx)
      .eq('id', id)
      .eq('user_id', user_id)
      .select();
    return { data, error };
  }

  /**
   * Delete transaction
   */
  async delete(id: string) {
    const user_id = this.userId();
    if (!user_id) return { data: null, error: 'not_authenticated' };
    const { data, error } = await this.supabase.client.from('transactions').delete().eq('id', id).eq('user_id', user_id);
    return { data, error };
  }

  /**
   * Get transaction statistics
   */
  getStatistics(filters?: TransactionFilters): Observable<TransactionStatistics[]> {
    const user_id = this.userId();
    if (!user_id) return of([]);

    let query = this.supabase.client
      .from('user_financial_summary')
      .select('*')
      .eq('user_id', user_id);

    // Apply currency filter if provided
    if (filters?.currency) {
      query = query.eq('currency', filters.currency);
    }

    return from(query).pipe(
      map((response) => {
        if (response.error) throw response.error;
        return response.data || [];
      }),
      catchError((error) => {
        console.error('Error fetching statistics:', error);
        return of([]);
      })
    );
  }

  /**
   * Get category distribution for charts
   */
  getCategoryDistribution(filters?: TransactionFilters): Observable<CategoryDistribution[]> {
    const user_id = this.userId();
    if (!user_id) return of([]);

    let query = this.supabase.client
      .from('transaction_category_summary')
      .select('*')
      .eq('user_id', user_id);

    // Apply filters
    if (filters) {
      if (filters.type && filters.type !== 'all') {
        query = query.eq('transaction_type', filters.type);
      }
      if (filters.currency) {
        query = query.eq('currency', filters.currency);
      }
    }

    return from(query).pipe(
      map((response) => {
        if (response.error) throw response.error;
        const data = response.data || [];

        // Calculate total for percentages
        const total = data.reduce((sum, item) => sum + Number(item.total_amount), 0);

        // Map to CategoryDistribution with percentages
        return data.map(item => ({
          category_id: item.category_id,
          category_name: item.category_name || 'Sin categoría',
          category_color: item.category_color || '#6b7280',
          category_icon: item.category_icon || 'category',
          transaction_count: item.transaction_count,
          total_amount: Number(item.total_amount),
          percentage: total > 0 ? (Number(item.total_amount) / total) * 100 : 0
        }));
      }),
      catchError((error) => {
        console.error('Error fetching category distribution:', error);
        return of([]);
      })
    );
  }

  /**
   * Get monthly trends for charts
   */
  getMonthlyTrends(months: number = 6, currency: string = 'ARS'): Observable<MonthlyTrend[]> {
    const user_id = this.userId();
    if (!user_id) return of([]);

    return from(
      this.supabase.client
        .from('transaction_monthly_summary')
        .select('*')
        .eq('user_id', user_id)
        .eq('currency', currency)
        .order('month', { ascending: true })
    ).pipe(
      map((response) => {
        if (response.error) throw response.error;
        const data = response.data || [];

        // Group by month
        const monthsMap = new Map<string, any>();
        data.forEach(item => {
          const monthKey = item.month.substring(0, 7); // YYYY-MM
          if (!monthsMap.has(monthKey)) {
            monthsMap.set(monthKey, {
              month: monthKey,
              income: 0,
              expenses: 0,
              transaction_count: 0
            });
          }
          const monthData = monthsMap.get(monthKey)!;
          if (item.type === 'income') {
            monthData.income = Number(item.total_amount);
          } else {
            monthData.expenses = Number(item.total_amount);
          }
          monthData.transaction_count += Number(item.transaction_count);
        });

        // Convert to array and format
        const trends: MonthlyTrend[] = Array.from(monthsMap.values())
          .slice(-months)
          .map(item => ({
            month: item.month,
            month_label: this.formatMonthLabel(item.month),
            income: item.income,
            expenses: item.expenses,
            net: item.income - item.expenses,
            transaction_count: item.transaction_count
          }));

        return trends;
      }),
      catchError((error) => {
        console.error('Error fetching monthly trends:', error);
        return of([]);
      })
    );
  }

  /**
   * Get daily data for the last N days
   */
  getDailyData(days: number = 30, currency: string = 'ARS'): Observable<DailyData[]> {
    const user_id = this.userId();
    if (!user_id) return of([]);

    return from(
      this.supabase.client
        .from('transaction_daily_summary')
        .select('*')
        .eq('user_id', user_id)
        .eq('currency', currency)
        .order('day', { ascending: true })
    ).pipe(
      map((response) => {
        if (response.error) throw response.error;
        const data = response.data || [];

        // Group by day
        const daysMap = new Map<string, any>();
        data.forEach(item => {
          if (!daysMap.has(item.day)) {
            daysMap.set(item.day, {
              date: item.day,
              income: 0,
              expenses: 0
            });
          }
          const dayData = daysMap.get(item.day)!;
          if (item.type === 'income') {
            dayData.income = Number(item.total_amount);
          } else {
            dayData.expenses = Number(item.total_amount);
          }
        });

        // Convert to array
        const dailyData: DailyData[] = Array.from(daysMap.values())
          .slice(-days)
          .map(item => ({
            date: item.date,
            income: item.income,
            expenses: item.expenses,
            net: item.income - item.expenses
          }));

        return dailyData;
      }),
      catchError((error) => {
        console.error('Error fetching daily data:', error);
        return of([]);
      })
    );
  }

  /**
   * Format month label for display
   */
  private formatMonthLabel(monthStr: string): string {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${monthNames[date.getMonth()]} ${year}`;
  }
}
