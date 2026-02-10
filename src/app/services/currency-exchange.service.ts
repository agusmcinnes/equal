import { Injectable } from '@angular/core';
import { SupabaseService } from '../core/supabase.service';
import { AuthService } from './auth.service';
import { TransactionsService } from './transactions.service';
import {
  CurrencyExchange,
  CurrencyExchangeWithDetails,
  ExchangePreview,
  ExchangeFormData
} from '../models/currency-exchange.model';
import { Transaction } from '../models/transaction.model';
import { from, Observable, map, catchError, of, switchMap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CurrencyExchangeService {
  constructor(
    private supabase: SupabaseService,
    private auth: AuthService,
    private transactionsService: TransactionsService
  ) {}

  private userId(): string | null {
    return this.auth.currentUserValue ? this.auth.currentUserValue.id : null;
  }

  /**
   * Calculate preview of the exchange operation
   * @param operation_type - 'buy_usd' or 'sell_usd'
   * @param amount - Amount in USD
   * @param exchange_rate - Rate to use
   * @param rate_source - Source of the rate
   */
  calculatePreview(
    operation_type: 'buy_usd' | 'sell_usd',
    amount: number,
    exchange_rate: number,
    rate_source: 'blue' | 'oficial' | 'custom'
  ): ExchangePreview {
    if (operation_type === 'buy_usd') {
      // Buying USD: Pay ARS, receive USD
      return {
        operation_type,
        source_amount: amount * exchange_rate,
        source_currency: 'ARS',
        destination_amount: amount,
        destination_currency: 'USD',
        exchange_rate,
        rate_source
      };
    } else {
      // Selling USD: Pay USD, receive ARS
      return {
        operation_type,
        source_amount: amount,
        source_currency: 'USD',
        destination_amount: amount * exchange_rate,
        destination_currency: 'ARS',
        exchange_rate,
        rate_source
      };
    }
  }

  /**
   * Execute a currency exchange
   * Creates two linked transactions (exchange) and the exchange record
   */
  async executeExchange(data: ExchangeFormData): Promise<{ success: boolean; error?: string; exchange?: CurrencyExchange }> {
    const user_id = this.userId();
    if (!user_id) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    try {
      const preview = this.calculatePreview(
        data.operation_type,
        data.amount,
        data.exchange_rate,
        data.rate_source
      );

      const now = new Date().toISOString();
      const formattedAmount = Number(data.amount).toLocaleString('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      const formattedRate = Number(data.exchange_rate).toLocaleString('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      const description = data.operation_type === 'buy_usd'
        ? `Cambio ARS → USD · ${formattedAmount} USD · Tasa ${formattedRate}`
        : `Cambio USD → ARS · ${formattedAmount} USD · Tasa ${formattedRate}`;

      // Create the exchange transaction (money leaving source wallet)
      const sourceExchangeTransaction: Transaction = {
        user_id,
        date: now,
        description,
        amount: -preview.source_amount,
        currency: preview.source_currency,
        wallet_id: data.source_wallet_id,
        type: 'exchange',
        is_recurring: false
      };

      const sourceResult = await this.transactionsService.create(sourceExchangeTransaction);
      if (sourceResult.error || !sourceResult.data || sourceResult.data.length === 0) {
        return { success: false, error: 'Error al crear transacción de salida' };
      }

      const sourceTransactionId = sourceResult.data[0].id;

      // Create the exchange transaction (money entering destination wallet)
      const destinationExchangeTransaction: Transaction = {
        user_id,
        date: now,
        description,
        amount: preview.destination_amount,
        currency: preview.destination_currency,
        wallet_id: data.destination_wallet_id,
        type: 'exchange',
        is_recurring: false
      };

      const destinationResult = await this.transactionsService.create(destinationExchangeTransaction);
      if (destinationResult.error || !destinationResult.data || destinationResult.data.length === 0) {
        // Rollback: delete the source transaction
        await this.transactionsService.delete(sourceTransactionId!);
        return { success: false, error: 'Error al crear transacción de entrada' };
      }

      const destinationTransactionId = destinationResult.data[0].id;

      // Create the currency exchange record
      const exchangeRecord: CurrencyExchange = {
        user_id,
        operation_type: data.operation_type,
        exchange_rate: data.exchange_rate,
        rate_source: data.rate_source,
        source_amount: preview.source_amount,
        source_currency: preview.source_currency,
        destination_amount: preview.destination_amount,
        destination_currency: preview.destination_currency,
        source_transaction_id: sourceTransactionId,
        destination_transaction_id: destinationTransactionId,
        source_wallet_id: data.source_wallet_id,
        destination_wallet_id: data.destination_wallet_id,
        notes: data.notes,
        executed_at: now
      };

      const { data: exchangeData, error: exchangeError } = await this.supabase.client
        .from('currency_exchanges')
        .insert([exchangeRecord])
        .select()
        .single();

      if (exchangeError) {
        // Rollback: delete both transactions
        await this.transactionsService.delete(sourceTransactionId!);
        await this.transactionsService.delete(destinationTransactionId!);
        return { success: false, error: 'Error al registrar el cambio de moneda' };
      }

      return { success: true, exchange: exchangeData };
    } catch (error) {
      console.error('Error executing exchange:', error);
      return { success: false, error: 'Error inesperado al ejecutar el cambio' };
    }
  }

  /**
   * List all currency exchanges for the current user
   */
  listExchanges(): Observable<CurrencyExchangeWithDetails[]> {
    const user_id = this.userId();
    if (!user_id) {
      return of([]);
    }

    return from(
      this.supabase.client
        .from('currency_exchanges_with_details')
        .select('*')
        .eq('user_id', user_id)
        .order('executed_at', { ascending: false })
    ).pipe(
      map((response) => {
        if (response.error) throw response.error;
        return response.data || [];
      }),
      catchError((error) => {
        console.error('Error fetching currency exchanges:', error);
        return of([]);
      })
    );
  }

  /**
   * Get a single exchange by ID
   */
  getExchangeById(id: string): Observable<CurrencyExchangeWithDetails | null> {
    const user_id = this.userId();
    if (!user_id) {
      return of(null);
    }

    return from(
      this.supabase.client
        .from('currency_exchanges_with_details')
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
        console.error('Error fetching exchange:', error);
        return of(null);
      })
    );
  }

  /**
   * Delete an exchange and its associated transactions
   */
  async deleteExchange(id: string): Promise<{ success: boolean; error?: string }> {
    const user_id = this.userId();
    if (!user_id) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    try {
      // First, get the exchange to find the linked transactions
      const { data: exchange, error: fetchError } = await this.supabase.client
        .from('currency_exchanges')
        .select('*')
        .eq('id', id)
        .eq('user_id', user_id)
        .single();

      if (fetchError || !exchange) {
        return { success: false, error: 'Cambio no encontrado' };
      }

      // Delete the source transaction if exists
      if (exchange.source_transaction_id) {
        await this.transactionsService.delete(exchange.source_transaction_id);
      }

      // Delete the destination transaction if exists
      if (exchange.destination_transaction_id) {
        await this.transactionsService.delete(exchange.destination_transaction_id);
      }

      // Delete the exchange record
      const { error: deleteError } = await this.supabase.client
        .from('currency_exchanges')
        .delete()
        .eq('id', id)
        .eq('user_id', user_id);

      if (deleteError) {
        return { success: false, error: 'Error al eliminar el cambio' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting exchange:', error);
      return { success: false, error: 'Error inesperado al eliminar el cambio' };
    }
  }
}
