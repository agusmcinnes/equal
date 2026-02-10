import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { WalletsService } from '../../services/wallets.service';
import { TransactionsService } from '../../services/transactions.service';
import { CategoriesService } from '../../services/categories.service';
import { Wallet, WalletWithBalance } from '../../models/wallet.model';
import { Transaction } from '../../models/transaction.model';
import { EmptyStateComponent } from '../../components/empty-state/empty-state';

interface WalletForm {
  name: string;
  provider: string;
  currency: string;
  balance: number;
}

interface ProviderOption {
  name: string;
  icon: string;
}

@Component({
  selector: 'app-wallets',
  standalone: true,
  imports: [CommonModule, FormsModule, EmptyStateComponent],
  templateUrl: './wallets.html',
  styleUrl: './wallets.css'
})
export class Wallets implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data
  wallets: WalletWithBalance[] = [];
  filteredWallets: WalletWithBalance[] = [];

  // UI State
  loading = false;
  formVisible = false;
  editing: Wallet | null = null;
  filterCurrency: 'all' | 'ARS' | 'USD' | 'EUR' | 'CRYPTO' = 'all';
  deleteConfirmId: string | null = null;

  // Reconciliation modal state
  reconcileVisible = false;
  reconcileWallet: WalletWithBalance | null = null;
  reconcileRealBalance: number | null = null;
  reconcileLoading = false;
  reconcileError = '';
  private readonly reconcileTolerance = 0.005;

  // Form model
  model: WalletForm = this.getEmptyWalletModel();
  fieldErrors: { [k: string]: string } = {};

  // Provider options
  availableProviders: ProviderOption[] = [
    { name: 'Mercado Pago', icon: 'account_balance_wallet' },
    { name: 'Ualá', icon: 'credit_card' },
    { name: 'Cash', icon: 'payments' },
    { name: 'Brubank', icon: 'account_balance' },
    { name: 'Banco', icon: 'account_balance' },
    { name: 'Binance', icon: 'currency_bitcoin' },
    { name: 'Otro', icon: 'wallet' }
  ];

  // Currency options
  currencies = [
    { code: 'ARS', name: 'Peso Argentino', symbol: '$', color: '#3b82f6' },
    { code: 'USD', name: 'Dólar Estadounidense', symbol: 'US$', color: '#10b981' },
    { code: 'EUR', name: 'Euro', symbol: '€', color: '#8b5cf6' },
    { code: 'CRYPTO', name: 'Criptomonedas', symbol: '₿', color: '#f59e0b' }
  ];

  constructor(
    private walletsService: WalletsService,
    private transactionsService: TransactionsService,
    private categoriesService: CategoriesService
  ) {}

  ngOnInit(): void {
    this.loadWallets();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadWallets(): void {
    this.loading = true;
    this.walletsService.listWithBalance()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.wallets = data;
          this.applyFilter();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading wallets:', error);
          this.wallets = [];
          this.loading = false;
        }
      });
  }

  applyFilter(): void {
    if (this.filterCurrency === 'all') {
      this.filteredWallets = this.wallets;
    } else {
      this.filteredWallets = this.wallets.filter(w => w.currency === this.filterCurrency);
    }
  }

  filterBy(currency: 'all' | 'ARS' | 'USD' | 'EUR' | 'CRYPTO'): void {
    this.filterCurrency = currency;
    this.applyFilter();
  }

  getWalletCountByCurrency(currency: string): number {
    if (currency === 'all') return this.wallets.length;
    return this.wallets.filter(w => w.currency === currency).length;
  }

  showWalletForm(edit?: Wallet): void {
    if (edit) {
      this.editing = edit;
      this.model = {
        name: edit.name || '',
        provider: edit.provider || 'Otro',
        currency: edit.currency || 'ARS',
        balance: edit.balance || 0
      };
    } else {
      this.editing = null;
      this.model = this.getEmptyWalletModel();
    }
    this.fieldErrors = {};
    this.formVisible = true;
  }

  closeWalletForm(): void {
    this.formVisible = false;
    this.editing = null;
    this.model = this.getEmptyWalletModel();
    this.fieldErrors = {};
  }

  validateWalletModel(): boolean {
    this.fieldErrors = {};
    if (!this.model.name || this.model.name.trim() === '') {
      this.fieldErrors['name'] = 'El nombre es requerido';
    }
    if (!this.model.provider) {
      this.fieldErrors['provider'] = 'Seleccione un proveedor';
    }
    if (!this.model.currency) {
      this.fieldErrors['currency'] = 'Seleccione una moneda';
    }
    if (this.model.balance === null || this.model.balance === undefined) {
      this.fieldErrors['balance'] = 'Ingrese un balance inicial';
    }
    return Object.keys(this.fieldErrors).length === 0;
  }

  saveWallet(): void {
    if (!this.validateWalletModel()) return;

    this.loading = true;

    if (this.editing && this.editing.id) {
      // Update wallet - solo nombre y proveedor (no currency ni balance)
      this.walletsService.update(this.editing.id, {
        name: this.model.name,
        provider: this.model.provider
      }).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.closeWalletForm();
          this.loadWallets();
        },
        error: (error) => {
          console.error('Error updating wallet:', error);
          alert('Error al actualizar la billetera');
          this.loading = false;
        }
      });
    } else {
      // Create new wallet with balance = 0 (initial balance will be a transaction)
      const initialBalance = this.model.balance;

      this.walletsService.create({
        name: this.model.name,
        provider: this.model.provider,
        currency: this.model.currency,
        balance: 0  // Always 0, initial balance goes as transaction
      }).pipe(takeUntil(this.destroy$)).subscribe({
        next: async (walletCreated) => {
          // Create initial transaction if there's an initial balance
          if (walletCreated && initialBalance > 0) {
            await this.createInitialTransaction(walletCreated, initialBalance);
          }
          this.closeWalletForm();
          this.loadWallets();
        },
        error: (error) => {
          console.error('Error creating wallet:', error);
          alert('Error al crear la billetera');
          this.loading = false;
        }
      });
    }
  }

  deleteWallet(id: string): void {
    if (!confirm('¿Está seguro de que desea eliminar esta billetera? Esta acción no se puede deshacer.')) return;

    this.loading = true;
    this.walletsService.delete(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          if (success) {
            this.deleteConfirmId = null;
            this.loadWallets();
          } else {
            alert('Error al eliminar la billetera');
            this.loading = false;
          }
        },
        error: (error) => {
          console.error('Error deleting wallet:', error);
          alert('Error al eliminar la billetera');
          this.loading = false;
        }
      });
  }

  getCurrencyInfo(code: string) {
    return this.currencies.find(c => c.code === code) || this.currencies[0];
  }

  getProviderIcon(provider: string): string {
    const p = this.availableProviders.find(prov => prov.name === provider);
    return p ? p.icon : 'wallet';
  }

  formatCurrency(amount: number, currency: string): string {
    const info = this.getCurrencyInfo(currency);
    const formatted = amount.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return `${info.symbol}${formatted}`;
  }

  getTotalBalance(): { [key: string]: number } {
    return {
      ARS: this.wallets
        .filter(w => w.currency === 'ARS')
        .reduce((sum, w) => sum + (w.current_balance || 0), 0),
      USD: this.wallets
        .filter(w => w.currency === 'USD')
        .reduce((sum, w) => sum + (w.current_balance || 0), 0),
      EUR: this.wallets
        .filter(w => w.currency === 'EUR')
        .reduce((sum, w) => sum + (w.current_balance || 0), 0),
      CRYPTO: this.wallets
        .filter(w => w.currency === 'CRYPTO')
        .reduce((sum, w) => sum + (w.current_balance || 0), 0)
    };
  }

  openReconcileModal(wallet: WalletWithBalance): void {
    this.reconcileWallet = wallet;
    this.reconcileRealBalance = wallet.current_balance ?? 0;
    this.reconcileError = '';
    this.reconcileVisible = true;
  }

  closeReconcileModal(): void {
    if (this.reconcileLoading) return;
    this.reconcileVisible = false;
    this.reconcileWallet = null;
    this.reconcileRealBalance = null;
    this.reconcileError = '';
  }

  get reconcileCurrentBalance(): number {
    return this.roundAmount(this.reconcileWallet?.current_balance ?? 0);
  }

  get reconcileDifference(): number {
    const real = this.normalizeAmount(this.reconcileRealBalance);
    if (real === null) return 0;
    return this.roundAmount(real - this.reconcileCurrentBalance);
  }

  get reconcileType(): 'income' | 'expense' {
    return this.reconcileDifference >= 0 ? 'income' : 'expense';
  }

  get reconcileCanConfirm(): boolean {
    return !!this.reconcileWallet && this.normalizeAmount(this.reconcileRealBalance) !== null && !this.isZeroDifference && !this.reconcileLoading;
  }

  get isZeroDifference(): boolean {
    return Math.abs(this.reconcileDifference) < this.reconcileTolerance;
  }

  get Math() {
    return Math;
  }

  onReconcileRealBalanceChange(value: any): void {
    const parsed = value === '' || value === null || value === undefined ? null : Number(value);
    this.reconcileRealBalance = Number.isFinite(parsed as number) ? (parsed as number) : null;
    this.reconcileError = '';
  }

  private normalizeAmount(value: number | null | undefined): number | null {
    if (value === null || value === undefined) return null;
    const num = Number(value);
    if (!Number.isFinite(num)) return null;
    return this.roundAmount(num);
  }

  private roundAmount(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  async confirmReconciliation(): Promise<void> {
    if (!this.reconcileWallet) return;
    const real = this.normalizeAmount(this.reconcileRealBalance);
    if (real === null) {
      this.reconcileError = 'Ingrese el saldo real para conciliar.';
      return;
    }

    const diff = this.reconcileDifference;
    if (this.isZeroDifference) {
      this.reconcileError = 'No hay diferencia para conciliar.';
      return;
    }

    this.reconcileLoading = true;
    this.reconcileError = '';

    try {
      const type: 'income' | 'expense' = diff > 0 ? 'income' : 'expense';
      const amount = this.roundAmount(Math.abs(diff));
      if (amount <= 0) {
        this.reconcileError = 'El ajuste debe ser mayor a 0.';
        this.reconcileLoading = false;
        return;
      }

      const { data: category, error: categoryError } = await this.categoriesService.getOrCreateAdjustmentCategory(type);
      if (categoryError || !category?.id) {
        this.reconcileError = 'No se pudo obtener la categoría de ajustes.';
        this.reconcileLoading = false;
        return;
      }

      const tx: Transaction = {
        date: new Date().toISOString(),
        description: 'Conciliación de billetera',
        category_id: category.id,
        amount,
        currency: this.reconcileWallet.currency || 'ARS',
        wallet_id: this.reconcileWallet.id || null,
        type,
        is_recurring: false
      };

      const { error } = await this.transactionsService.create(tx);
      if (error) {
        this.reconcileError = 'Error al crear el ajuste de conciliación.';
        this.reconcileLoading = false;
        return;
      }

      this.reconcileLoading = false;
      this.closeReconcileModal();
      this.loadWallets();
    } catch (err) {
      console.error('Error reconciling wallet:', err);
      this.reconcileError = 'Error inesperado al conciliar.';
      this.reconcileLoading = false;
    }
  }

  private async createInitialTransaction(wallet: Wallet, amount: number): Promise<void> {
    const initialTransaction: Transaction = {
      date: new Date().toISOString(),
      description: `Balance inicial - ${wallet.name}`,
      amount: amount,
      currency: wallet.currency || 'ARS',
      type: 'income',
      wallet_id: wallet.id || null,
      category_id: null,
      is_recurring: false
    };

    const { error } = await this.transactionsService.create(initialTransaction);
    if (error) {
      console.error('Error creating initial transaction:', error);
    }
  }

  private getEmptyWalletModel(): WalletForm {
    return {
      name: '',
      provider: 'Otro',
      currency: 'ARS',
      balance: 0
    };
  }
}
