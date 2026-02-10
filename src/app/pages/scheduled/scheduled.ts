import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, take } from 'rxjs/operators';
import { ScheduledTransactionsService } from '../../services/scheduled-transactions.service';
import { CategoriesService } from '../../services/categories.service';
import { WalletsService } from '../../services/wallets.service';
import { ScheduledTransaction, ScheduledTransactionWithDetails } from '../../models/scheduled-transaction.model';
import { Category } from '../../models/category.model';
import { Wallet } from '../../models/wallet.model';
import { ScheduledCardComponent } from '../../components/scheduled-card/scheduled-card';
import { ScheduledModalComponent } from '../../components/scheduled-modal/scheduled-modal';
import { EmptyStateComponent } from '../../components/empty-state/empty-state';

@Component({
  selector: 'app-scheduled',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ScheduledCardComponent,
    ScheduledModalComponent,
    EmptyStateComponent
  ],
  templateUrl: './scheduled.html',
  styleUrl: './scheduled.css'
})
export class ScheduledComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data
  allScheduledTransactions: ScheduledTransactionWithDetails[] = [];
  incomeTransactions: ScheduledTransactionWithDetails[] = [];
  expenseTransactions: ScheduledTransactionWithDetails[] = [];
  categories: Category[] = [];
  wallets: Wallet[] = [];

  // UI State
  isModalOpen = false;
  modalMode: 'create' | 'edit' = 'create';
  selectedTransaction: ScheduledTransactionWithDetails | null = null;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  modalDefaultType: 'income' | 'expense' = 'expense';

  constructor(
    private scheduledTransactionsService: ScheduledTransactionsService,
    private categoriesService: CategoriesService,
    private walletsService: WalletsService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async loadData(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      // Load categories with defaults seeding
      await this.loadCategories();

      // Load wallets (convert to promise with proper typing)
      this.wallets = await this.walletsService.list()
        .pipe(take(1))
        .toPromise() || [];

      // Load scheduled transactions
      const rawTransactions = await this.scheduledTransactionsService.getUserScheduledTransactions()
        .pipe(take(1))
        .toPromise() || [];

      const grouped = this.groupScheduledTransactions(rawTransactions);
      this.allScheduledTransactions = grouped.items;

      const executedSummary = await this.scheduledTransactionsService.getExecutedSummaryByRecurringIds(grouped.allIds);

      this.allScheduledTransactions = this.allScheduledTransactions.map(transaction => {
        const groupIds = transaction.id ? grouped.groupIdsByDisplayId.get(transaction.id) || [] : [];
        const groupSummary = this.mergeExecutionSummaries(groupIds, executedSummary);

        return {
          ...transaction,
          accrued_real: groupSummary.total,
          executed_count: groupSummary.count,
          executed_last_date: groupSummary.lastDate
        };
      });

      this.filterTransactions();
    } catch (error) {
      console.error('Error loading data:', error);
      this.errorMessage = 'Error al cargar los datos. Por favor, recarga la página.';
    } finally {
      this.isLoading = false;
    }
  }

  private async loadCategories(): Promise<void> {
    try {
      const { data } = await this.categoriesService.list();
      this.categories = data || [];

      // Seed defaults if empty
      if (this.categories.length === 0) {
        const { data: defaults } = await this.categoriesService.listDefaults();
        if (defaults && defaults.length) {
          for (const d of defaults) {
            await this.categoriesService.create({
              name: d.name,
              type: d.type,
              color: d.color,
              icon: d.icon
            } as Category);
          }
          const { data: after } = await this.categoriesService.list();
          this.categories = after || [];
        }
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      this.categories = [];
    }
  }

  private filterTransactions(): void {
    this.incomeTransactions = this.allScheduledTransactions.filter(t => t.type === 'income');
    this.expenseTransactions = this.allScheduledTransactions.filter(t => t.type === 'expense');
  }

  private groupScheduledTransactions(transactions: ScheduledTransactionWithDetails[]): {
    items: ScheduledTransactionWithDetails[];
    groupIdsByDisplayId: Map<string, string[]>;
    allIds: string[];
  } {
    const groups = new Map<string, ScheduledTransactionWithDetails[]>();

    transactions.forEach(transaction => {
      const key = this.getScheduledSignature(transaction);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(transaction);
    });

    const items: ScheduledTransactionWithDetails[] = [];
    const groupIdsByDisplayId = new Map<string, string[]>();
    const allIds: string[] = [];

    groups.forEach(group => {
      const sorted = [...group].sort((a, b) => this.getDeduplicationScore(b) - this.getDeduplicationScore(a));
      const display = sorted[0];
      const ids = group.map(t => t.id).filter((id): id is string => !!id);
      allIds.push(...ids);

      if (display?.id) {
        groupIdsByDisplayId.set(display.id, ids);
        items.push(display);
      }
    });

    return { items, groupIdsByDisplayId, allIds };
  }

  private mergeExecutionSummaries(
    groupIds: string[],
    summary: Record<string, { count: number; total: number; lastDate?: string }>
  ): { count: number; total: number; lastDate: string | null } {
    return groupIds.reduce(
      (acc, id) => {
        const data = summary[id];
        if (!data) return acc;

        acc.count += data.count || 0;
        acc.total += data.total || 0;

        if (data.lastDate && (!acc.lastDate || data.lastDate > acc.lastDate)) {
          acc.lastDate = data.lastDate;
        }

        return acc;
      },
      { count: 0, total: 0, lastDate: null as string | null }
    );
  }

  private getScheduledSignature(transaction: ScheduledTransactionWithDetails): string {
    const description = (transaction.description || '').trim().toLowerCase();
    const start = this.normalizeDateForSignature(transaction.start_date);
    const end = this.normalizeDateForSignature(transaction.end_date);

    return [
      transaction.type,
      transaction.amount,
      transaction.currency,
      transaction.category_id || '',
      transaction.wallet_id || '',
      transaction.frequency,
      start,
      end,
      description
    ].join('|');
  }

  private normalizeDateForSignature(dateValue?: string | null): string {
    if (!dateValue) return '';

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '';

    return date.toISOString().split('T')[0];
  }

  private getDeduplicationScore(transaction: ScheduledTransactionWithDetails): number {
    const updatedAt = transaction.updated_at ? new Date(transaction.updated_at).getTime() : 0;
    const nextExecution = transaction.next_execution_date ? new Date(transaction.next_execution_date).getTime() : 0;
    const createdAt = transaction.created_at ? new Date(transaction.created_at).getTime() : 0;

    return Math.max(updatedAt, nextExecution, createdAt);
  }

  openCreateModal(type: 'income' | 'expense'): void {
    this.selectedTransaction = null;
    this.modalMode = 'create';
    this.modalDefaultType = type;
    this.isModalOpen = true;
    this.errorMessage = '';
  }

  openEditModal(transaction: ScheduledTransactionWithDetails): void {
    this.selectedTransaction = transaction;
    this.modalMode = 'edit';
    this.isModalOpen = true;
    this.errorMessage = '';
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedTransaction = null;
    this.errorMessage = '';
  }

  onSaveTransaction(transaction: ScheduledTransaction): void {
    this.isLoading = true;
    this.errorMessage = '';

    if (this.modalMode === 'create') {
      this.scheduledTransactionsService.createScheduledTransaction(transaction)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.successMessage = 'Transacción programada creada correctamente';
            this.closeModal();
            this.loadData();
            this.showSuccessMessage();
          },
          error: (error: any) => {
            console.error('Error creating scheduled transaction:', error);
            const errorMsg = error?.message || error?.error?.message || 'Error desconocido';
            this.errorMessage = `No se pudo crear la transacción: ${errorMsg}`;
            this.isLoading = false;
          }
        });
    } else if (this.modalMode === 'edit' && this.selectedTransaction?.id) {
      this.scheduledTransactionsService.updateScheduledTransaction(this.selectedTransaction.id, transaction)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.successMessage = 'Transacción programada actualizada correctamente';
            this.closeModal();
            this.loadData();
            this.showSuccessMessage();
          },
          error: (error: any) => {
            console.error('Error updating scheduled transaction:', error);
            const errorMsg = error?.message || error?.error?.message || 'Error desconocido';
            this.errorMessage = `No se pudo actualizar la transacción: ${errorMsg}`;
            this.isLoading = false;
          }
        });
    }
  }

  onDeleteTransaction(id: string): void {
    if (!confirm('¿Estás seguro de que deseas eliminar esta transacción programada?')) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.scheduledTransactionsService.deleteScheduledTransaction(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.successMessage = 'Transacción programada eliminada correctamente';
          this.loadData();
          this.showSuccessMessage();
        },
        error: (error: any) => {
          console.error('Error deleting scheduled transaction:', error);
          const errorMsg = error?.message || error?.error?.message || 'Error desconocido';
          this.errorMessage = `No se pudo eliminar la transacción: ${errorMsg}`;
          this.isLoading = false;
        }
      });
  }

  onToggleTransaction(data: { id: string; isActive: boolean }): void {
    this.isLoading = true;
    this.errorMessage = '';

    const newState = !data.isActive;
    const updateData: Partial<ScheduledTransaction> = { is_active: newState };

    this.scheduledTransactionsService.updateScheduledTransaction(data.id, updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.successMessage = newState ? 'Transacción reanudada correctamente' : 'Transacción pausada correctamente';
          this.loadData();
          this.showSuccessMessage();
        },
        error: (error: any) => {
          console.error('Error toggling scheduled transaction:', error);
          const errorMsg = error?.message || error?.error?.message || 'Error desconocido';
          this.errorMessage = `No se pudo cambiar el estado: ${errorMsg}`;
          this.isLoading = false;
        }
      });
  }

  private showSuccessMessage(): void {
    setTimeout(() => {
      this.successMessage = '';
    }, 3000);
  }

  getIncomeTotalMonthly(): number {
    return this.incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
  }

  getExpenseTotalMonthly(): number {
    return this.expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
  }

  private getProjectionSummary(transactions: ScheduledTransactionWithDetails[]): { total: number; hasOpenEnded: boolean } {
    let total = 0;
    let hasOpenEnded = false;

    transactions.forEach(transaction => {
      const projected = this.scheduledTransactionsService.getProjectedAmount(transaction);
      if (projected === null) {
        hasOpenEnded = true;
      } else {
        total += projected;
      }
    });

    return { total, hasOpenEnded };
  }

  private formatAmount(amount: number): string {
    return amount.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  private getAccruedRealAmount(transaction: ScheduledTransactionWithDetails): number {
    if (typeof transaction.accrued_real === 'number') {
      return transaction.accrued_real;
    }

    return this.scheduledTransactionsService.getAccruedAmount(transaction);
  }

  getIncomeAccruedTotal(): number {
    return this.incomeTransactions.reduce((sum, t) => sum + this.getAccruedRealAmount(t), 0);
  }

  getExpenseAccruedTotal(): number {
    return this.expenseTransactions.reduce((sum, t) => sum + this.getAccruedRealAmount(t), 0);
  }

  getIncomeProjectionLabel(): string {
    const summary = this.getProjectionSummary(this.incomeTransactions);
    if (summary.total === 0 && summary.hasOpenEnded) return 'Sin fin';
    if (summary.hasOpenEnded) return `${this.formatAmount(summary.total)} ARS+`;
    return `${this.formatAmount(summary.total)} ARS`;
  }

  getExpenseProjectionLabel(): string {
    const summary = this.getProjectionSummary(this.expenseTransactions);
    if (summary.total === 0 && summary.hasOpenEnded) return 'Sin fin';
    if (summary.hasOpenEnded) return `${this.formatAmount(summary.total)} ARS+`;
    return `${this.formatAmount(summary.total)} ARS`;
  }

  getActiveIncomeCount(): number {
    return this.incomeTransactions.filter(t => t.is_active).length;
  }

  getActiveExpenseCount(): number {
    return this.expenseTransactions.filter(t => t.is_active).length;
  }
}
