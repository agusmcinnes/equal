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

  async create(cat: Category) {
    const user_id = this.userId();
    if (!user_id) return { data: null, error: 'not_authenticated' };
    cat.user_id = user_id;
    const { data, error } = await this.supabase.from('categories').insert([cat]);
    return { data, error };
  }

  async listDefaults() {
    const { data, error } = await this.supabase.from('default_categories').select('*').order('name');
    return { data, error };
  }
}
