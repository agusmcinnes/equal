import { Injectable } from '@angular/core';
import { SupabaseService } from '../core/supabase.service';
import { AuthService } from './auth.service';
import { Category } from '../models/category.model';

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  constructor(private supabase: SupabaseService, private auth: AuthService) {}

  private userId(): string | null {
    return this.auth.currentUserValue ? this.auth.currentUserValue.id : null;
  }

  async list() {
    const user_id = this.userId();
    if (!user_id) return { data: [], error: 'not_authenticated' };
    const { data, error } = await this.supabase.from('categories').select('*').eq('user_id', user_id).order('name');
    return { data, error };
  }

  async listByType(type: 'income' | 'expense') {
    const user_id = this.userId();
    if (!user_id) return { data: [], error: 'not_authenticated' };
    const { data, error } = await this.supabase.from('categories').select('*').eq('user_id', user_id).eq('type', type).order('name');
    return { data, error };
  }

  async create(cat: Category) {
    const user_id = this.userId();
    if (!user_id) return { data: null, error: 'not_authenticated' };
    cat.user_id = user_id;
    const { data, error } = await this.supabase.from('categories').insert([cat]);
    return { data, error };
  }

  async update(id: string, cat: Partial<Category>) {
    const user_id = this.userId();
    if (!user_id) return { data: null, error: 'not_authenticated' };
    const { data, error } = await this.supabase.from('categories').update(cat).eq('id', id).eq('user_id', user_id);
    return { data, error };
  }

  async delete(id: string) {
    const user_id = this.userId();
    if (!user_id) return { data: null, error: 'not_authenticated' };
    const { data, error } = await this.supabase.from('categories').delete().eq('id', id).eq('user_id', user_id);
    return { data, error };
  }

  async listDefaults() {
    const { data, error } = await this.supabase.from('default_categories').select('*').order('name');
    return { data, error };
  }

  /**
   * Gets the default "Ahorros/Objetivos" category
   */
  async getGoalsDefaultCategory() {
    const { data, error } = await this.supabase
      .from('default_categories')
      .select('*')
      .eq('name', 'Ahorros/Objetivos')
      .single();
    return { data, error };
  }

  /**
   * Gets or creates the user's "Ahorros/Objetivos" category
   * This ensures the user has this category for goal transactions
   */
  async getOrCreateGoalsCategory(): Promise<{ data: any; error: any }> {
    const user_id = this.userId();
    if (!user_id) return { data: null, error: 'not_authenticated' };

    // Check if user already has this category
    const { data: existing, error: searchError } = await this.supabase
      .from('categories')
      .select('*')
      .eq('user_id', user_id)
      .eq('name', 'Ahorros/Objetivos')
      .maybeSingle();

    if (searchError) return { data: null, error: searchError };
    if (existing) return { data: existing, error: null };

    // Get default category as template
    const { data: defaultCat } = await this.getGoalsDefaultCategory();

    // Create user's category based on default
    const newCategory: Category = {
      user_id: user_id,
      name: 'Ahorros/Objetivos',
      type: 'expense',
      color: defaultCat?.color || '#463397',
      icon: defaultCat?.icon || 'savings'
    };

    const { data, error } = await this.supabase
      .from('categories')
      .insert([newCategory])
      .select()
      .single();

    return { data, error };
  }
}
