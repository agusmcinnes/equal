import { Injectable } from '@angular/core';
import { SupabaseService } from '../core/supabase.service';
import { Transaction } from '../models/transaction.model';
import { AuthService } from './auth.service';

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

  async list(filter: { type?: string; category_id?: string; from?: string; to?: string } = {}) {
    const user_id = this.userId();
    if (!user_id) return { data: [], error: 'not_authenticated' };

    let query = this.supabase.from('transactions').select('*').eq('user_id', user_id).order('date', { ascending: false });

    if (filter.type) query = query.eq('type', filter.type);
    if (filter.category_id) query = query.eq('category_id', filter.category_id);
    if (filter.from) query = query.gte('date', filter.from);
    if (filter.to) query = query.lte('date', filter.to);

    const { data, error } = await query;
    return { data, error };
  }

  async getById(id: string) {
    const user_id = this.userId();
    if (!user_id) return { data: null, error: 'not_authenticated' };
    const { data, error } = await this.supabase.from('transactions').select('*').eq('id', id).eq('user_id', user_id).single();
    return { data, error };
  }

  async create(tx: Transaction) {
    const user_id = this.userId();
    if (!user_id) return { data: null, error: 'not_authenticated' };
    tx.user_id = user_id;
    const { data, error } = await this.supabase.from('transactions').insert([tx]);
    return { data, error };
  }

  async update(id: string, tx: Partial<Transaction>) {
    const user_id = this.userId();
    if (!user_id) return { data: null, error: 'not_authenticated' };
    const { data, error } = await this.supabase.from('transactions').update(tx).eq('id', id).eq('user_id', user_id);
    return { data, error };
  }

  async delete(id: string) {
    const user_id = this.userId();
    if (!user_id) return { data: null, error: 'not_authenticated' };
    const { data, error } = await this.supabase.from('transactions').delete().eq('id', id).eq('user_id', user_id);
    return { data, error };
  }
}
