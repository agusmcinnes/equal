import { Injectable } from '@angular/core';
import { SupabaseService } from '../core/supabase.service';
import { AuthService } from './auth.service';
import { ScheduledTransaction, ScheduledTransactionWithDetails, ScheduledTransactionFilters } from '../models/scheduled-transaction.model';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class ScheduledTransactionsService {
  private scheduledTransactionsSubject = new BehaviorSubject<ScheduledTransactionWithDetails[]>([]);
  public scheduledTransactions$ = this.scheduledTransactionsSubject.asObservable();

  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService
  ) {
    this.initializeScheduledTransactions();
  }

  /**
   * Lazy getter for Supabase client
   */
  private get supabase() {
    return this.supabaseService.client;
  }

  /**
   * Inicializa la carga de transacciones programadas del usuario actual
   */
  private initializeScheduledTransactions(): void {
    this.authService.currentUser.subscribe((user: User | null) => {
      if (user) {
        this.loadUserScheduledTransactions();
      }
    });
  }

  /**
   * Carga todas las transacciones programadas del usuario actual
   */
  private loadUserScheduledTransactions(): void {
    this.getUserScheduledTransactions().subscribe();
  }

  /**
   * Obtiene todas las transacciones programadas del usuario
   */
  getUserScheduledTransactions(): Observable<ScheduledTransactionWithDetails[]> {
    return new Observable(observer => {
      this.authService.currentUser.subscribe(async (user: User | null) => {
        if (!user) {
          observer.next([]);
          return;
        }

        try {
          const { data, error } = await this.supabase
            .from('scheduled_transactions_with_details')
            .select('*')
            .eq('user_id', user.id)
            .order('next_execution_date', { ascending: true });

          if (error) throw error;
          this.scheduledTransactionsSubject.next(data || []);
          observer.next(data || []);
        } catch (error) {
          console.error('Error loading scheduled transactions:', error);
          observer.error(error);
        }
      });
    });
  }

  /**
   * Obtiene transacciones programadas filtradas
   */
  getScheduledTransactions(filters?: ScheduledTransactionFilters): Observable<ScheduledTransactionWithDetails[]> {
    return new Observable(observer => {
      this.authService.currentUser.subscribe(async (user: User | null) => {
        if (!user) {
          observer.next([]);
          return;
        }

        try {
          let query = this.supabase
            .from('scheduled_transactions_with_details')
            .select('*')
            .eq('user_id', user.id);

          // Aplicar filtros
          if (filters?.type && filters.type !== 'all') {
            query = query.eq('type', filters.type);
          }
          if (filters?.category_ids && filters.category_ids.length > 0) {
            query = query.in('category_id', filters.category_ids);
          }
          if (filters?.wallet_ids && filters.wallet_ids.length > 0) {
            query = query.in('wallet_id', filters.wallet_ids);
          }
          if (filters?.currency) {
            query = query.eq('currency', filters.currency);
          }
          if (filters?.is_active !== undefined) {
            query = query.eq('is_active', filters.is_active);
          }

          const { data, error } = await query.order('next_execution_date', { ascending: true });

          if (error) throw error;
          observer.next(data || []);
        } catch (error) {
          console.error('Error filtering scheduled transactions:', error);
          observer.error(error);
        }
      });
    });
  }

  /**
   * Obtiene una transacción programada por ID
   */
  getScheduledTransactionById(id: string): Observable<ScheduledTransactionWithDetails | null> {
    return new Observable(observer => {
      this.supabase
        .from('scheduled_transactions_with_details')
        .select('*')
        .eq('id', id)
        .single()
        .then(({ data, error }) => {
          if (error) {
            console.error('Error getting scheduled transaction:', error);
            observer.next(null);
          } else {
            observer.next(data);
          }
          observer.complete();
        });
    });
  }

  /**
   * Crea una nueva transacción programada
   */
  createScheduledTransaction(transaction: ScheduledTransaction): Observable<ScheduledTransaction> {
    return new Observable(observer => {
      this.authService.currentUser.pipe(
        tap(async (user: User | null) => {
          if (!user) {
            observer.error('User not authenticated');
            return;
          }

          try {
            const newTransaction = {
              ...transaction,
              user_id: user.id
            };

            const { data, error } = await this.supabase
              .from('scheduled_transactions')
              .insert([newTransaction])
              .select()
              .single();

            if (error) throw error;

            // Recargar transacciones
            this.loadUserScheduledTransactions();
            observer.next(data);
            observer.complete();
          } catch (error) {
            console.error('Error creating scheduled transaction:', error);
            observer.error(error);
          }
        })
      ).subscribe();
    });
  }

  /**
   * Actualiza una transacción programada existente
   */
  updateScheduledTransaction(id: string, updates: Partial<ScheduledTransaction>): Observable<ScheduledTransaction> {
    return new Observable(observer => {
      this.authService.currentUser.pipe(
        tap(async (user: User | null) => {
          if (!user) {
            observer.error('User not authenticated');
            return;
          }

          try {
            const { data, error } = await this.supabase
              .from('scheduled_transactions')
              .update(updates)
              .eq('id', id)
              .eq('user_id', user.id)
              .select()
              .single();

            if (error) throw error;

            // Recargar transacciones
            this.loadUserScheduledTransactions();
            observer.next(data);
            observer.complete();
          } catch (error) {
            console.error('Error updating scheduled transaction:', error);
            observer.error(error);
          }
        })
      ).subscribe();
    });
  }

  /**
   * Elimina una transacción programada
   */
  deleteScheduledTransaction(id: string): Observable<void> {
    return new Observable(observer => {
      this.authService.currentUser.pipe(
        tap(async (user: User | null) => {
          if (!user) {
            observer.error('User not authenticated');
            return;
          }

          try {
            const { error } = await this.supabase
              .from('scheduled_transactions')
              .delete()
              .eq('id', id)
              .eq('user_id', user.id);

            if (error) throw error;

            // Recargar transacciones
            this.loadUserScheduledTransactions();
            observer.next();
            observer.complete();
          } catch (error) {
            console.error('Error deleting scheduled transaction:', error);
            observer.error(error);
          }
        })
      ).subscribe();
    });
  }

  /**
   * Desactiva una transacción programada
   */
  deactivateScheduledTransaction(id: string): Observable<ScheduledTransaction> {
    return this.updateScheduledTransaction(id, { is_active: false });
  }

  /**
   * Activa una transacción programada
   */
  activateScheduledTransaction(id: string): Observable<ScheduledTransaction> {
    return this.updateScheduledTransaction(id, { is_active: true });
  }

  /**
   * Obtiene transacciones programadas pendientes de ejecutar
   */
  getPendingScheduledTransactions(): Observable<ScheduledTransactionWithDetails[]> {
    return new Observable(observer => {
      this.supabase
        .from('pending_scheduled_transactions')
        .select('*')
        .then(({ data, error }: any) => {
          if (error) {
            console.error('Error getting pending scheduled transactions:', error);
            observer.next([]);
          } else {
            observer.next(data || []);
          }
          observer.complete();
        });
    });
  }

  /**
   * Calcula la próxima fecha de ejecución basada en frecuencia
   */
  calculateNextExecutionDate(currentDate: Date, frequency: string): Date {
    const date = new Date(currentDate);

    switch (frequency) {
      case 'daily':
        date.setDate(date.getDate() + 1);
        break;
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'bi-weekly':
        date.setDate(date.getDate() + 14);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'quarterly':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'bi-annual':
        date.setMonth(date.getMonth() + 6);
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1);
        break;
      default:
        date.setMonth(date.getMonth() + 1);
    }

    return date;
  }

  /**
   * Obtiene el label de frecuencia en español
   */
  getFrequencyLabel(frequency: string): string {
    const labels: { [key: string]: string } = {
      'daily': 'Diariamente',
      'weekly': 'Semanalmente',
      'bi-weekly': 'Cada 2 semanas',
      'monthly': 'Mensualmente',
      'quarterly': 'Trimestralmente',
      'bi-annual': 'Semestralmente',
      'yearly': 'Anualmente'
    };
    return labels[frequency] || frequency;
  }
}
