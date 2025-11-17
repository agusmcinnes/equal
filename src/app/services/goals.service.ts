import { Injectable } from '@angular/core';
import { SupabaseService } from '../core/supabase.service';
import { AuthService } from './auth.service';
import { Goal, GoalMovement, GoalWithMovements } from '../models/goal.model';

@Injectable({ providedIn: 'root' })
export class GoalsService {
  constructor(private supabase: SupabaseService, private auth: AuthService) {}

  private userId(): string | null {
    return this.auth.currentUserValue ? this.auth.currentUserValue.id : null;
  }

  async list() {
    const user_id = this.userId();
    if (!user_id) return { data: [], error: 'not_authenticated' };
    const { data, error } = await this.supabase
      .from('goals')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });
    return { data, error };
  }

  async listActive() {
    const user_id = this.userId();
    if (!user_id) return { data: [], error: 'not_authenticated' };
    const { data, error } = await this.supabase
      .from('goals')
      .select('*')
      .eq('user_id', user_id)
      .eq('is_completed', false)
      .order('target_date', { ascending: true });
    return { data, error };
  }

  async listCompleted() {
    const user_id = this.userId();
    if (!user_id) return { data: [], error: 'not_authenticated' };
    const { data, error } = await this.supabase
      .from('goals')
      .select('*')
      .eq('user_id', user_id)
      .eq('is_completed', true)
      .order('completed_at', { ascending: false });
    return { data, error };
  }

  async getById(id: string) {
    const user_id = this.userId();
    if (!user_id) return { data: null, error: 'not_authenticated' };
    const { data, error } = await this.supabase
      .from('goals')
      .select('*')
      .eq('id', id)
      .eq('user_id', user_id)
      .single();
    return { data, error };
  }

  async getWithMovements(id: string): Promise<{ data: GoalWithMovements | null; error: any }> {
    const user_id = this.userId();
    if (!user_id) return { data: null, error: 'not_authenticated' };

    const { data: goal, error: goalError } = await this.supabase
      .from('goals')
      .select('*')
      .eq('id', id)
      .eq('user_id', user_id)
      .single();

    if (goalError) return { data: null, error: goalError };

    const { data: movements, error: movementsError } = await this.supabase
      .from('goal_movements')
      .select('*')
      .eq('goal_id', id)
      .order('created_at', { ascending: false });

    if (movementsError) return { data: goal, error: null };

    return {
      data: {
        ...(goal as Goal),
        movements: movements as GoalMovement[]
      },
      error: null
    };
  }

  async create(goal: Goal) {
    const user_id = this.userId();
    if (!user_id) return { data: null, error: 'not_authenticated' };
    goal.user_id = user_id;
    const { data, error } = await this.supabase.from('goals').insert([goal]);
    return { data, error };
  }

  async update(id: string, goal: Partial<Goal>) {
    const user_id = this.userId();
    if (!user_id) return { data: null, error: 'not_authenticated' };
    const { data, error } = await this.supabase
      .from('goals')
      .update(goal)
      .eq('id', id)
      .eq('user_id', user_id);
    return { data, error };
  }

  async delete(id: string) {
    const user_id = this.userId();
    if (!user_id) return { data: null, error: 'not_authenticated' };
    const { data, error } = await this.supabase
      .from('goals')
      .delete()
      .eq('id', id)
      .eq('user_id', user_id);
    return { data, error };
  }

  async addMovement(movement: GoalMovement) {
    const user_id = this.userId();
    if (!user_id) return { data: null, error: 'not_authenticated' };
    movement.user_id = user_id;
    const { data, error } = await this.supabase.from('goal_movements').insert([movement]);
    return { data, error };
  }

  async deleteMovement(id: string) {
    const user_id = this.userId();
    if (!user_id) return { data: null, error: 'not_authenticated' };
    const { data, error } = await this.supabase
      .from('goal_movements')
      .delete()
      .eq('id', id)
      .eq('user_id', user_id);
    return { data, error };
  }

  async getMovements(goalId: string) {
    const { data, error } = await this.supabase
      .from('goal_movements')
      .select('*')
      .eq('goal_id', goalId)
      .order('created_at', { ascending: false });
    return { data, error };
  }

  calculateProgress(currentAmount: number, targetAmount: number): number {
    if (targetAmount === 0) return 0;
    return Math.min((currentAmount / targetAmount) * 100, 100);
  }

  calculateRemainingAmount(currentAmount: number, targetAmount: number): number {
    return Math.max(targetAmount - currentAmount, 0);
  }
}
