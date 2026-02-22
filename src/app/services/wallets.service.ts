import { Injectable } from '@angular/core';
import { SupabaseService } from '../core/supabase.service';
import { AuthService } from './auth.service';
import { Wallet, WalletWithBalance } from '../models/wallet.model';
import { from, Observable, map, catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WalletsService {
  constructor(
    private supabase: SupabaseService,
    private auth: AuthService
  ) {}

  private userId(): string | null {
    return this.auth.currentUserValue ? this.auth.currentUserValue.id : null;
  }

  /**
   * Get all wallets for the current user
   */
  list(): Observable<Wallet[]> {
    const user_id = this.userId();
    if (!user_id) {
      console.error('User not authenticated');
      return of([]);
    }

    return from(
      this.supabase.client
        .from('wallets')
        .select('*')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false })
    ).pipe(
      map((response) => {
        if (response.error) throw response.error;
        return response.data || [];
      }),
      catchError((error) => {
        console.error('Error fetching wallets:', error);
        return of([]);
      })
    );
  }

  /**
   * Get wallets with calculated current balance (from view)
   */
  listWithBalance(): Observable<WalletWithBalance[]> {
    const user_id = this.userId();
    if (!user_id) {
      console.error('User not authenticated');
      return of([]);
    }

    return from(
      this.supabase.client
        .from('wallet_current_balance')
        .select('*')
        .eq('user_id', user_id)
    ).pipe(
      map((response) => {
        if (response.error) throw response.error;
        return response.data || [];
      }),
      catchError((error) => {
        console.error('Error fetching wallets with balance:', error);
        return of([]);
      })
    );
  }

  /**
   * Get wallet by ID
   */
  getById(id: string): Observable<Wallet | null> {
    const user_id = this.userId();
    if (!user_id) {
      console.error('User not authenticated');
      return of(null);
    }

    return from(
      this.supabase.client
        .from('wallets')
        .select('*')
        .eq('id', id)
        .eq('user_id', user_id)
        .single()
    ).pipe(
      map((response) => {
        if (response.error) throw response.error;
        return response.data;
      }),
      catchError((error) => {
        console.error('Error fetching wallet:', error);
        return of(null);
      })
    );
  }

  /**
   * Get wallets by currency
   */
  getByCurrency(currency: string): Observable<Wallet[]> {
    const user_id = this.userId();
    if (!user_id) {
      console.error('User not authenticated');
      return of([]);
    }

    return from(
      this.supabase.client
        .from('wallets')
        .select('*')
        .eq('user_id', user_id)
        .eq('currency', currency)
        .order('created_at', { ascending: false })
    ).pipe(
      map((response) => {
        if (response.error) throw response.error;
        return response.data || [];
      }),
      catchError((error) => {
        console.error('Error fetching wallets by currency:', error);
        return of([]);
      })
    );
  }

  /**
   * Create a new wallet
   */
  create(wallet: Omit<Wallet, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Observable<Wallet | null> {
    const user_id = this.userId();
    if (!user_id) {
      console.error('User not authenticated');
      return of(null);
    }

    return from(
      this.supabase.client
        .from('wallets')
        .insert([{
          user_id: user_id,
          name: wallet.name,
          provider: wallet.provider || 'Otro',
          currency: wallet.currency || 'ARS',
          balance: wallet.balance || 0
        }])
        .select()
        .single()
    ).pipe(
      map((response) => {
        if (response.error) throw response.error;
        return response.data;
      }),
      catchError((error) => {
        console.error('Error creating wallet:', error);
        return of(null);
      })
    );
  }

  /**
   * Update an existing wallet
   */
  update(id: string, updates: Partial<Wallet>): Observable<Wallet | null> {
    const user_id = this.userId();
    if (!user_id) {
      console.error('User not authenticated');
      return of(null);
    }

    return from(
      this.supabase.client
        .from('wallets')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user_id)
        .select()
        .single()
    ).pipe(
      map((response) => {
        if (response.error) throw response.error;
        return response.data;
      }),
      catchError((error) => {
        console.error('Error updating wallet:', error);
        return of(null);
      })
    );
  }

  /**
   * Delete a wallet
   */
  delete(id: string): Observable<boolean> {
    const user_id = this.userId();
    if (!user_id) {
      console.error('User not authenticated');
      return of(false);
    }

    return from(
      this.supabase.client
        .from('wallets')
        .delete()
        .eq('id', id)
        .eq('user_id', user_id)
    ).pipe(
      map((response) => {
        if (response.error) throw response.error;
        return true;
      }),
      catchError((error) => {
        console.error('Error deleting wallet:', error);
        return of(false);
      })
    );
  }

  /**
   * Initialize default wallets for a new user
   */
  initializeDefaultWallets(): Observable<Wallet[]> {
    const user_id = this.userId();
    if (!user_id) {
      console.error('User not authenticated');
      return of([]);
    }

    const defaultWallets = [
      { user_id, name: 'Efectivo ARS', provider: 'Cash', currency: 'ARS', balance: 0 },
      { user_id, name: 'Efectivo USD', provider: 'Cash', currency: 'USD', balance: 0 }
    ];

    return from(
      this.supabase.client
        .from('wallets')
        .insert(defaultWallets)
        .select()
    ).pipe(
      map((response) => {
        if (response.error) throw response.error;
        return response.data || [];
      }),
      catchError((error) => {
        console.error('Error initializing default wallets:', error);
        return of([]);
      })
    );
  }
}
