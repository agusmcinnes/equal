import { Injectable } from '@angular/core';
import { SupabaseService } from '../core/supabase.service';
import { AuthService } from './auth.service';
import { Goal, GoalMovement, GoalWithMovements } from '../models/goal.model';
import { Transaction } from '../models/transaction.model';

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

  /**
   * Creates a goal movement and its associated transaction atomically
   * This ensures the goal deposit/withdrawal is reflected in the user's balance
   */
  async createMovementWithTransaction(
    goalId: string,
    amount: number,
    type: 'deposit' | 'withdrawal',
    walletId: string | null,
    currency: string,
    categoryId: string | null,
    description?: string
  ) {
    const user_id = this.userId();
    if (!user_id) return { data: null, error: 'not_authenticated' };

    try {
      // 1. Create the transaction
      // Deposit = money goes OUT of wallet (expense)
      // Withdrawal = money comes BACK to wallet (income)
      // wallet_id can be null if no wallet is selected
      const transaction: Transaction = {
        user_id: user_id,
        date: new Date().toISOString(),
        description: description || `${type === 'deposit' ? 'Depósito en' : 'Retiro de'} objetivo`,
        category_id: categoryId,
        amount: amount,
        currency: currency,
        wallet_id: walletId,
        type: type === 'deposit' ? 'expense' : 'income',
        goal_id: goalId
      };

      const { data: txData, error: txError } = await this.supabase.client
        .from('transactions')
        .insert([transaction])
        .select()
        .single();

      if (txError) {
        return { data: null, error: txError };
      }

      // 2. Create the goal movement with transaction reference
      const movement: GoalMovement = {
        goal_id: goalId,
        user_id: user_id,
        amount: amount,
        type: type,
        description: description,
        transaction_id: txData.id,
        wallet_id: walletId || undefined
      };

      const { data: movementData, error: movementError } = await this.supabase
        .from('goal_movements')
        .insert([movement])
        .select()
        .single();

      if (movementError) {
        // Rollback: delete the transaction
        await this.supabase.client
          .from('transactions')
          .delete()
          .eq('id', txData.id);
        return { data: null, error: movementError };
      }

      // 3. The trigger will automatically update goal.current_amount
      // Return both movement and transaction
      return {
        data: {
          movement: movementData,
          transaction: txData
        },
        error: null
      };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Deletes a goal movement and its associated transaction atomically
   */
  async deleteMovementWithTransaction(movementId: string) {
    const user_id = this.userId();
    if (!user_id) return { data: null, error: 'not_authenticated' };

    try {
      // 1. Get the movement to find the linked transaction
      const { data: movement, error: getError } = await this.supabase
        .from('goal_movements')
        .select('*')
        .eq('id', movementId)
        .eq('user_id', user_id)
        .single();

      if (getError) return { data: null, error: getError };

      // 2. Delete the movement (this will also update goal via trigger)
      const { error: deleteMovementError } = await this.supabase
        .from('goal_movements')
        .delete()
        .eq('id', movementId)
        .eq('user_id', user_id);

      if (deleteMovementError) {
        return { data: null, error: deleteMovementError };
      }

      // 3. Delete the associated transaction if exists
      if (movement.transaction_id) {
        await this.supabase.client
          .from('transactions')
          .delete()
          .eq('id', movement.transaction_id)
          .eq('user_id', user_id);
      }

      return { data: true, error: null };
    } catch (error) {
      return { data: null, error };
    }
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
