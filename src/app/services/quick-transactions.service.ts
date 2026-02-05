import { Injectable } from '@angular/core';
import { SupabaseService } from '../core/supabase.service';
import { QuickTransaction, QuickTransactionWithDetails } from '../models/quick-transaction.model';
import { Transaction } from '../models/transaction.model';
import { AuthService } from './auth.service';
import { TransactionsService } from './transactions.service';
import { from, Observable, map, catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class QuickTransactionsService {
  constructor(
    private supabase: SupabaseService,
    private auth: AuthService,
    private transactionsService: TransactionsService
  ) {}

  private userId(): string | null {
    return this.auth.currentUserValue ? this.auth.currentUserValue.id : null;
  }

  /**
   * List all quick transaction templates ordered by use count (most used first)
   */
  list(): Observable<QuickTransactionWithDetails[]> {
    const user_id = this.userId();
    if (!user_id) return of([]);

    return from(
      this.supabase.client
        .from('quick_transactions_with_details')
        .select('*')
        .eq('user_id', user_id)
        .order('use_count', { ascending: false })
    ).pipe(
      map((response) => {
        if (response.error) throw response.error;
        return response.data || [];
      }),
      catchError((error) => {
        console.error('Error fetching quick transactions:', error);
        return of([]);
      })
    );
  }

  /**
   * Create a new quick transaction template
   */
  async create(template: QuickTransaction): Promise<{ data: QuickTransaction | null; error: any }> {
    const user_id = this.userId();
    if (!user_id) return { data: null, error: 'not_authenticated' };

    template.user_id = user_id;
    template.use_count = 0;

    const { data, error } = await this.supabase.client
      .from('quick_transactions')
      .insert([template])
      .select()
      .single();

    return { data, error };
  }

  /**
   * Update a quick transaction template
   */
  async update(id: string, template: Partial<QuickTransaction>): Promise<{ data: QuickTransaction | null; error: any }> {
    const user_id = this.userId();
    if (!user_id) return { data: null, error: 'not_authenticated' };

    const { data, error } = await this.supabase.client
      .from('quick_transactions')
      .update(template)
      .eq('id', id)
      .eq('user_id', user_id)
      .select()
      .single();

    return { data, error };
  }

  /**
   * Delete a quick transaction template
   */
  async delete(id: string): Promise<{ data: any; error: any }> {
    const user_id = this.userId();
    if (!user_id) return { data: null, error: 'not_authenticated' };

    const { data, error } = await this.supabase.client
      .from('quick_transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', user_id);

    return { data, error };
  }

  /**
   * Execute a quick transaction template:
   * 1. Creates a real transaction with current date
   * 2. Increments the use_count of the template
   */
  async execute(template: QuickTransactionWithDetails): Promise<{ data: Transaction | null; error: any }> {
    const user_id = this.userId();
    if (!user_id) return { data: null, error: 'not_authenticated' };

    // Create real transaction with current date
    const transaction: Transaction = {
      date: new Date().toISOString(),
      description: template.name,
      type: template.type,
      amount: template.amount,
      currency: template.currency,
      crypto_type: template.crypto_type,
      category_id: template.category_id,
      wallet_id: template.wallet_id,
      is_recurring: false
    };

    const { data: txData, error: txError } = await this.transactionsService.create(transaction);

    if (txError) {
      return { data: null, error: txError };
    }

    // Increment use_count
    if (template.id) {
      await this.supabase.client
        .from('quick_transactions')
        .update({ use_count: (template.use_count || 0) + 1 })
        .eq('id', template.id)
        .eq('user_id', user_id);
    }

    return { data: txData?.[0] || null, error: null };
  }

  /**
   * Create a quick transaction directly without saving as template
   */
  async createQuick(data: {
    type: 'income' | 'expense';
    amount: number;
    currency: string;
    category_id?: string | null;
    wallet_id?: string | null;
  }): Promise<{ data: Transaction[] | null; error: any }> {
    const transaction: Transaction = {
      date: new Date().toISOString(),
      description: data.type === 'income' ? 'Ingreso rápido' : 'Gasto rápido',
      type: data.type,
      amount: data.amount,
      currency: data.currency,
      category_id: data.category_id || null,
      wallet_id: data.wallet_id || null,
      is_recurring: false
    };

    return this.transactionsService.create(transaction);
  }
}
