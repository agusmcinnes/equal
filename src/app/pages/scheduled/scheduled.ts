import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ScheduledTransactionsService } from '../../services/scheduled-transactions.service';
import { CategoriesService } from '../../services/categories.service';
import { WalletsService } from '../../services/wallets.service';
import { ScheduledTransaction, ScheduledTransactionWithDetails } from '../../models/scheduled-transaction.model';
import { Category } from '../../models/category.model';
import { Wallet } from '../../models/wallet.model';
import { ScheduledCardComponent } from '../../components/scheduled-card/scheduled-card';
import { ScheduledModalComponent } from '../../components/scheduled-modal/scheduled-modal';

@Component({
  selector: 'app-scheduled',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ScheduledCardComponent,
    ScheduledModalComponent
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

  private loadData(): void {
    this.isLoading = true;

    // Load categories
    this.categoriesService.list()
      .then((result: any) => {
        this.categories = result.data || [];
      })
      .catch((error: any) => console.error('Error loading categories:', error));

    // Load wallets
    this.walletsService.list()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (wallets: any[]) => {
          this.wallets = wallets;
        },
        error: (error: any) => console.error('Error loading wallets:', error)
      });

    // Load scheduled transactions
    this.scheduledTransactionsService.getUserScheduledTransactions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (transactions) => {
          this.allScheduledTransactions = transactions;
          this.filterTransactions();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading scheduled transactions:', error);
          this.errorMessage = 'Error al cargar las transacciones programadas';
          this.isLoading = false;
        }
      });
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
            this.errorMessage = 'Error al crear la transacción programada';
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
            this.errorMessage = 'Error al actualizar la transacción programada';
            this.isLoading = false;
          }
        });
    }
  }

  onDeleteTransaction(id: string): void {
    this.isLoading = true;
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
          this.errorMessage = 'Error al eliminar la transacción programada';
          this.isLoading = false;
        }
      });
  }

  onToggleTransaction(data: { id: string; isActive: boolean }): void {
    this.isLoading = true;
    const newState = !data.isActive;
    this.scheduledTransactionsService.updateScheduledTransaction(data.id, { is_active: newState })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.successMessage = newState ? 'Transacción reanudada' : 'Transacción pausada';
          this.loadData();
          this.showSuccessMessage();
        },
        error: (error: any) => {
          console.error('Error toggling scheduled transaction:', error);
          this.errorMessage = 'Error al cambiar el estado de la transacción';
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
