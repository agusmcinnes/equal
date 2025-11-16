import { Injectable } from '@angular/core';
import { SupabaseService } from '../core/supabase.service';
import { Wallet, WalletWithBalance } from '../models/wallet.model';
import { from, Observable, map, catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WalletsService {
  constructor(private supabase: SupabaseService) {}

  /**
   * Get all wallets for the current user
   */
  list(): Observable<Wallet[]> {
    return from(
      this.supabase.client
        .from('wallets')
        .select('*')
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
    return from(
      this.supabase.client
        .from('wallet_current_balance')
        .select('*')
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
    return from(
      this.supabase.client
        .from('wallets')
        .select('*')
        .eq('id', id)
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
    return from(
      this.supabase.client
        .from('wallets')
        .select('*')
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
    return from(
      this.supabase.client
        .from('wallets')
        .insert([{
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
    return from(
      this.supabase.client
        .from('wallets')
        .update(updates)
        .eq('id', id)
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
    return from(
      this.supabase.client
        .from('wallets')
        .delete()
        .eq('id', id)
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
    const defaultWallets = [
      { name: 'Efectivo', provider: 'Cash', currency: 'ARS', balance: 0 },
      { name: 'Mercado Pago', provider: 'Mercado Pago', currency: 'ARS', balance: 0 }
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
