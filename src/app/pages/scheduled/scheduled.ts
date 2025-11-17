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
      this.allScheduledTransactions = await this.scheduledTransactionsService.getUserScheduledTransactions()
        .pipe(take(1))
        .toPromise() || [];

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

  getActiveIncomeCount(): number {
    return this.incomeTransactions.filter(t => t.is_active).length;
  }

  getActiveExpenseCount(): number {
    return this.expenseTransactions.filter(t => t.is_active).length;
  }
}
