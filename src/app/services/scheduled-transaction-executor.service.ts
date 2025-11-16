import { Injectable, OnDestroy } from '@angular/core';
import { SupabaseService } from '../core/supabase.service';
import { ScheduledTransactionsService } from './scheduled-transactions.service';
import { TransactionsService } from './transactions.service';
import { AuthService } from './auth.service';
import { Subject, interval, Subscription } from 'rxjs';
import { switchMap, filter, takeUntil } from 'rxjs/operators';
import { ScheduledTransactionWithDetails } from '../models/scheduled-transaction.model';
import { Transaction } from '../models/transaction.model';

@Injectable({
  providedIn: 'root'
})
export class ScheduledTransactionExecutorService implements OnDestroy {
  private destroy$ = new Subject<void>();
  private executionSubscription: Subscription | null = null;
  private lastExecutionCheck = new Date();

  // Ejecutar chequeo cada minuto
  private readonly CHECK_INTERVAL_MS = 60000; // 1 minuto

  constructor(
    private supabaseService: SupabaseService,
    private scheduledTransactionsService: ScheduledTransactionsService,
    private transactionsService: TransactionsService,
    private authService: AuthService
  ) {
    this.initializeExecutor();
  }

  /**
   * Lazy getter for Supabase client
   */
  private get supabase() {
    return this.supabaseService.client;
  }

  /**
   * Inicializa el ejecutor cuando el usuario está autenticado
   */
  private initializeExecutor(): void {
    this.authService.currentUser
      .pipe(
        filter(user => !!user),
        switchMap(() => interval(this.CHECK_INTERVAL_MS)),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.checkAndExecutePendingTransactions();
      });
  }

  /**
   * Verifica y ejecuta transacciones programadas pendientes
   */
  private checkAndExecutePendingTransactions(): void {
    this.scheduledTransactionsService.getPendingScheduledTransactions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (pendingTransactions: ScheduledTransactionWithDetails[]) => {
          pendingTransactions.forEach(transaction => {
            this.executeScheduledTransaction(transaction);
          });
        },
        error: (error: any) => {
          console.error('Error checking pending transactions:', error);
        }
      });
  }

  /**
   * Ejecuta una transacción programada
   * Crea una transacción real en el historial
   */
  private async executeScheduledTransaction(scheduledTransaction: ScheduledTransactionWithDetails): Promise<void> {
    try {
      const now = new Date();

      // Verificar que la fecha de ejecución ha llegado
      if (new Date(scheduledTransaction.next_execution_date) > now) {
        return;
      }

      // Verificar que no ha expirado
      if (scheduledTransaction.end_date && new Date(scheduledTransaction.end_date) < now) {
        // Desactivar la transacción programada si ha expirado
        this.scheduledTransactionsService.deactivateScheduledTransaction(scheduledTransaction.id!)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            error: (error: any) => console.error('Error deactivating expired transaction:', error)
          });
        return;
      }

      // Crear transacción real basada en la programada
      const newTransaction: Transaction = {
        date: now.toISOString(),
        description: scheduledTransaction.description,
        category_id: scheduledTransaction.category_id || null,
        amount: scheduledTransaction.amount,
        currency: scheduledTransaction.currency,
        crypto_type: scheduledTransaction.crypto_type || null,
        wallet_id: scheduledTransaction.wallet_id || null,
        type: scheduledTransaction.type,
        is_recurring: true,
        recurring_id: scheduledTransaction.id
      };

      // Crear la transacción en el historial
      const { data, error } = await this.transactionsService.create(newTransaction);
      if (error) {
        console.error('Error executing scheduled transaction:', error);
        return;
      }

      console.log(`✓ Transacción programada ejecutada: ${scheduledTransaction.description}`);
      // Actualizar próxima fecha de ejecución
      this.updateNextExecutionDate(scheduledTransaction);
    } catch (error) {
      console.error('Error in executeScheduledTransaction:', error);
    }
  }

  /**
   * Actualiza la próxima fecha de ejecución
   */
  private updateNextExecutionDate(transaction: ScheduledTransactionWithDetails): void {
    const currentNextDate = new Date(transaction.next_execution_date);
    const newNextDate = this.calculateNextDate(currentNextDate, transaction.frequency);

    this.scheduledTransactionsService.updateScheduledTransaction(transaction.id!, {
      last_execution_date: new Date().toISOString(),
      next_execution_date: newNextDate.toISOString()
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => {
          console.error('Error updating next execution date:', error);
        }
      });
  }

  /**
   * Calcula la siguiente fecha de ejecución según la frecuencia
   */
  private calculateNextDate(currentDate: Date, frequency: string): Date {
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
   * Ejecuta inmediatamente una transacción programada (para testing)
   */
  public executeNow(transactionId: string): void {
    this.scheduledTransactionsService.getScheduledTransactionById(transactionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (transaction) => {
          if (transaction) {
            this.executeScheduledTransaction(transaction);
          }
        },
        error: (error) => console.error('Error executing now:', error)
      });
  }

  /**
   * Obtiene el próximo tiempo de ejecución para una transacción
   */
  public getTimeUntilExecution(nextExecutionDate: string): string {
    const now = new Date();
    const next = new Date(nextExecutionDate);
    const diffMs = next.getTime() - now.getTime();

    if (diffMs < 0) {
      return 'Pendiente';
    }

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.executionSubscription) {
      this.executionSubscription.unsubscribe();
    }
  }
}
