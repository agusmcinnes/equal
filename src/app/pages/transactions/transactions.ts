import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, take } from 'rxjs';
import { TransactionsService } from '../../services/transactions.service';
import { CategoriesService } from '../../services/categories.service';
import { WalletsService } from '../../services/wallets.service';
import { StatisticsService } from '../../services/statistics.service';
import {
  Transaction,
  TransactionWithDetails,
  TransactionStatistics,
  CategoryDistribution,
  TransactionSort
} from '../../models/transaction.model';
import { Category } from '../../models/category.model';
import { Wallet } from '../../models/wallet.model';
import { StatCardComponent } from '../../components/stat-card/stat-card';
import { CategoryBadgeComponent } from '../../components/category-badge/category-badge';
import { EmptyStateComponent } from '../../components/empty-state/empty-state';
import { DatetimePickerComponent } from '../../components/datetime-picker/datetime-picker';
import { CustomSelectComponent, SelectOption } from '../../components/custom-select/custom-select';
import { NgxChartsModule, LegendPosition } from '@swimlane/ngx-charts';

interface GroupedTransactions {
  label: string;
  transactions: TransactionWithDetails[];
}

@Component({
  selector: 'app-transactions',
  imports: [
    CommonModule,
    FormsModule,
    StatCardComponent,
    CategoryBadgeComponent,
    EmptyStateComponent,
    DatetimePickerComponent,
    CustomSelectComponent,
    NgxChartsModule
  ],
  templateUrl: './transactions.html',
  styleUrl: './transactions.css'
})
export class Transactions implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data
  transactions: TransactionWithDetails[] = [];
  allTransactions: TransactionWithDetails[] = [];
  rawTransactions: TransactionWithDetails[] = []; // Unfiltered data from DB
  groupedTransactions: GroupedTransactions[] = [];
  categories: Category[] = [];
  wallets: Wallet[] = [];

  // Statistics
  statistics: TransactionStatistics | null = null;
  categoryDistribution: CategoryDistribution[] = [];
  pieChartData: any[] = [];
  incomeByCategoryData: any[] = [];
  expensesByCategoryData: any[] = [];

  // Sorting & Pagination
  sort: TransactionSort = { field: 'date', order: 'desc' };
  currentPage = 1;
  pageSize = 20;
  totalPages = 1;

  // UI State
  loading = false;
  statsLoading = false;
  formVisible = false;
  editing: Transaction | null = null;
  filterCurrency: 'all' | 'ARS' | 'USD' | 'EUR' | 'CRYPTO' = 'all';
  filterType: 'all' | 'income' | 'expense' = 'all';

  // Select options
  typeOptions: SelectOption[] = [
    { value: 'all', label: 'Todos', icon: 'list' },
    { value: 'income', label: 'Ingresos', icon: 'trending_up' },
    { value: 'expense', label: 'Gastos', icon: 'trending_down' }
  ];

  currencyOptions: SelectOption[] = [
    { value: 'all', label: 'Todas', icon: 'currency_exchange' },
    { value: 'ARS', label: 'ARS', icon: 'attach_money' },
    { value: 'USD', label: 'USD', icon: 'attach_money' },
    { value: 'EUR', label: 'EUR', icon: 'euro' },
    { value: 'CRYPTO', label: 'CRYPTO', icon: 'currency_bitcoin' }
  ];

  transactionTypeOptions: SelectOption[] = [
    { value: 'income', label: 'Ingreso', icon: 'trending_up' },
    { value: 'expense', label: 'Gasto', icon: 'trending_down' }
  ];

  formCurrencyOptions: SelectOption[] = [
    { value: 'ARS', label: 'Pesos (ARS)', icon: 'attach_money' },
    { value: 'USD', label: 'Dólares (USD)', icon: 'attach_money' },
    { value: 'EUR', label: 'Euros (EUR)', icon: 'euro' },
    { value: 'CRYPTO', label: 'Criptomonedas', icon: 'currency_bitcoin' }
  ];

  cryptoTypeOptions: SelectOption[] = [
    { value: 'BTC', label: 'Bitcoin (BTC)', icon: 'currency_bitcoin' },
    { value: 'ETH', label: 'Ethereum (ETH)', icon: 'currency_bitcoin' },
    { value: 'USDC', label: 'USD Coin (USDC)', icon: 'currency_bitcoin' },
    { value: 'USDT', label: 'Tether (USDT)', icon: 'currency_bitcoin' }
  ];

  // Cached options (updated when data loads)
  categorySelectOptions: SelectOption[] = [];
  walletSelectOptions: SelectOption[] = [];
  categoriesLoaded = false;
  walletsLoaded = false;

  // Form model
  model: Transaction = this.getEmptyModel();
  fieldErrors: { [k: string]: string } = {};

  // Chart options - Verde para Ingresos, Rojo para Gastos
  colorScheme: any = {
    domain: ['#10b981', '#ef4444']
  };

  // Color schemes for category distribution charts
  incomeCategoryColorScheme: any = {
    domain: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5', '#86efac', '#4ade80', '#22c55e']
  };

  expenseCategoryColorScheme: any = {
    domain: ['#ef4444', '#f87171', '#fca5a5', '#fecaca', '#fee2e2', '#dc2626', '#b91c1c', '#991b1b']
  };

  legendPosition: LegendPosition = LegendPosition.Below;

  constructor(
    private txService: TransactionsService,
    private catService: CategoriesService,
    private walletsService: WalletsService,
    public statsService: StatisticsService
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadInitialData(): Promise<void> {
    this.loading = true;

    // Load categories first
    await this.loadCategories();

    // Load wallets (convert to promise to wait for completion)
    this.wallets = await this.walletsService.list()
      .pipe(take(1))
      .toPromise() || [];
    this.updateWalletOptions();

    // Load transactions and stats (last 30 days)
    await this.loadData();

    this.loading = false;
  }

  async loadCategories(): Promise<void> {
    const { data } = await this.catService.list();
    this.categories = data || [];

    // Seed defaults if empty
    if (this.categories.length === 0) {
      const { data: defaults } = await this.catService.listDefaults();
      if (defaults && defaults.length) {
        for (const d of defaults) {
          await this.catService.create({ name: d.name, type: d.type, color: d.color, icon: d.icon } as any);
        }
        const { data: after } = await this.catService.list();
        this.categories = after || [];
      }
    }

    // Update cached options
    this.updateCategoryOptions();
  }

  private updateCategoryOptions(): void {
    this.categorySelectOptions = [
      { value: null, label: 'Sin categoría', icon: 'category' },
      ...this.categories.map(cat => ({
        value: cat.id,
        label: cat.name,
        icon: cat.icon || 'category'
      }))
    ];
    this.categoriesLoaded = true;
  }

  private updateWalletOptions(): void {
    this.walletSelectOptions = [
      { value: null, label: 'Sin billetera', icon: 'account_balance_wallet' },
      ...this.wallets.map(w => ({
        value: w.id,
        label: `${w.name} (${w.currency})`,
        icon: 'account_balance_wallet'
      }))
    ];
    this.walletsLoaded = true;
  }

  async loadData(): Promise<void> {
    this.loading = true;
    this.statsLoading = true;

    // Load transactions (last 30 days automatically)
    await this.loadTransactionsLegacy();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.allTransactions.length / this.pageSize);
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.transactions = this.allTransactions.slice(start, end);
    this.updateGroupedTransactions();
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePagination();
  }

  changeSort(field: 'date' | 'amount' | 'description' | 'category' | 'wallet'): void {
    if (this.sort.field === field) {
      this.sort.order = this.sort.order === 'asc' ? 'desc' : 'asc';
    } else {
      this.sort = { field, order: 'desc' };
    }
    this.currentPage = 1;
    this.applyFilters();
  }

  changeCurrencyFilter(currency: 'all' | 'ARS' | 'USD' | 'EUR' | 'CRYPTO'): void {
    this.filterCurrency = currency;
    this.currentPage = 1;
    this.applyFilters();
  }

  changeTypeFilter(type: 'all' | 'income' | 'expense'): void {
    this.filterType = type;
    this.currentPage = 1;
    this.applyFilters();
  }

  private applyFilters(): void {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Filter from cached raw data
    let filtered = this.rawTransactions.filter(tx => {
      // Filter by currency
      if (this.filterCurrency !== 'all' && tx.currency !== this.filterCurrency) return false;
      // Filter by type
      if (this.filterType !== 'all' && tx.type !== this.filterType) return false;
      // Filter by last 30 days
      const txDate = new Date(tx.date);
      if (txDate < thirtyDaysAgo || txDate > today) return false;
      return true;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (this.sort.field) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'description':
          comparison = (a.description || '').localeCompare(b.description || '');
          break;
        case 'category':
          comparison = (a.category_name || '').localeCompare(b.category_name || '');
          break;
        case 'wallet':
          comparison = (a.wallet_name || '').localeCompare(b.wallet_name || '');
          break;
      }
      return this.sort.order === 'asc' ? comparison : -comparison;
    });

    this.allTransactions = filtered;
    this.updatePagination();
    this.calculateStatistics();
  }

  private updateGroupedTransactions(): void {
    const groups = new Map<string, TransactionWithDetails[]>();

    this.transactions.forEach(tx => {
      const label = this.statsService.getRelativeTimeLabel(new Date(tx.date));
      if (!groups.has(label)) {
        groups.set(label, []);
      }
      groups.get(label)!.push(tx);
    });

    this.groupedTransactions = Array.from(groups.entries()).map(([label, transactions]) => ({
      label,
      transactions
    }));
  }

  // Form methods
  showForm(edit?: TransactionWithDetails): void {
    if (edit) {
      this.editing = edit;
      // Create a completely clean model using only valid fields
      this.model = this.cleanTransactionModel(edit) as Transaction;
    } else {
      this.editing = null;
      this.model = this.getEmptyModel();
    }
    this.fieldErrors = {};
    this.formVisible = true;
  }

  closeForm(): void {
    this.formVisible = false;
    this.editing = null;
    this.model = this.getEmptyModel();
    this.fieldErrors = {};
  }

  validateModel(): boolean {
    this.fieldErrors = {};
    if (!this.model.date) this.fieldErrors['date'] = 'La fecha es requerida';
    if (!this.model.amount || this.model.amount <= 0) this.fieldErrors['amount'] = 'Ingrese un monto válido';
    if (!this.model.type) this.fieldErrors['type'] = 'Seleccione un tipo';
    if (!this.model.currency) this.fieldErrors['currency'] = 'Seleccione una moneda';
    if (this.model.currency === 'CRYPTO' && !this.model.crypto_type) this.fieldErrors['crypto_type'] = 'Seleccione un tipo de cripto';
    return Object.keys(this.fieldErrors).length === 0;
  }

  private cleanTransactionModel(model: any): Partial<Transaction> {
    // ONLY include valid transaction table fields
    const clean: any = {
      date: model.date,
      type: model.type,
      amount: model.amount,
      currency: model.currency
    };

    // Add optional fields only if defined
    if (model.description !== undefined && model.description !== null) {
      clean.description = model.description;
    }
    if (model.category_id !== undefined && model.category_id !== null) {
      clean.category_id = model.category_id;
    }
    if (model.wallet_id !== undefined && model.wallet_id !== null) {
      clean.wallet_id = model.wallet_id;
    }
    if (model.crypto_type !== undefined && model.crypto_type !== null) {
      clean.crypto_type = model.crypto_type;
    }
    if (model.is_recurring !== undefined) {
      clean.is_recurring = model.is_recurring;
    }
    if (model.recurring_id !== undefined && model.recurring_id !== null) {
      clean.recurring_id = model.recurring_id;
    }

    return clean;
  }

  async save(): Promise<void> {
    if (!this.validateModel()) return;

    this.loading = true;
    try {
      const cleanModel = this.cleanTransactionModel(this.model);

      if (this.editing && this.editing.id) {
        const result = await this.txService.update(this.editing.id, cleanModel);
        if (result.error) {
          console.error('Error updating transaction:', result.error);
          const errorMsg = typeof result.error === 'string' ? result.error : result.error.message;
          alert('Error al actualizar la transacción: ' + errorMsg);
          return;
        }
      } else {
        const result = await this.txService.create(cleanModel as Transaction);
        if (result.error) {
          console.error('Error creating transaction:', result.error);
          const errorMsg = typeof result.error === 'string' ? result.error : result.error.message;
          alert('Error al crear la transacción: ' + errorMsg);
          return;
        }
      }
      this.closeForm();
      await this.loadData();
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('Error al guardar la transacción');
    } finally {
      this.loading = false;
    }
  }

  async remove(id?: string): Promise<void> {
    if (!id || !confirm('¿Estás seguro de eliminar esta transacción?')) return;

    try {
      await this.txService.delete(id);
      await this.loadData();
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  }

  formatCurrency(amount: number, currency: string = 'ARS'): string {
    return this.statsService.formatCurrency(amount, currency);
  }

  private getEmptyModel(): Transaction {
    return {
      date: new Date().toISOString(),
      description: '',
      amount: 0,
      currency: 'ARS',
      type: 'expense',
      category_id: null,
      wallet_id: null
    };
  }

  get Math() {
    return Math;
  }


  private async loadTransactionsLegacy(): Promise<void> {
    const { data } = await this.txService.list();

    // Map to TransactionWithDetails and cache as raw data
    this.rawTransactions = (data || []).map(tx => {
      const category = this.categories.find(c => c.id === tx.category_id);
      const wallet = this.wallets.find(w => w.id === tx.wallet_id);

      return {
        ...tx,
        category_name: category?.name,
        category_color: category?.color,
        category_icon: category?.icon,
        category_type: category?.type,
        wallet_name: wallet?.name,
        wallet_provider: wallet?.provider
      } as TransactionWithDetails;
    });

    this.loading = false;

    // Apply filters from cached data
    this.applyFilters();
  }

  private calculateStatistics(): void {
    // All transactions are already filtered to selected currency in last 30 days
    const filtered = this.allTransactions;

    const income = filtered.filter(t => t.type === 'income');
    const expenses = filtered.filter(t => t.type === 'expense');

    const total_income = income.reduce((sum, t) => sum + t.amount, 0);
    const total_expenses = expenses.reduce((sum, t) => sum + t.amount, 0);

    this.statistics = {
      total_income,
      total_expenses,
      net_balance: total_income - total_expenses,
      transaction_count: filtered.length,
      income_count: income.length,
      expense_count: expenses.length,
      currency: this.filterCurrency === 'all' ? 'ARS' : this.filterCurrency
    };

    // Create simple Income vs Expenses pie chart data
    this.pieChartData = [
      {
        name: 'Ingresos',
        value: total_income
      },
      {
        name: 'Gastos',
        value: total_expenses
      }
    ];

    // Calculate category distributions for pie charts
    this.incomeByCategoryData = this.calculateCategoryDistribution(filtered, 'income');
    this.expensesByCategoryData = this.calculateCategoryDistribution(filtered, 'expense');

    this.statsLoading = false;
  }

  private calculateCategoryDistribution(transactions: TransactionWithDetails[], type: 'income' | 'expense'): any[] {
    const filtered = transactions.filter(t => t.type === type);
    const categoryMap = new Map<string, { count: number; total: number; name: string; color: string; icon: string }>();

    filtered.forEach(tx => {
      const key = tx.category_id || 'uncategorized';
      const existing = categoryMap.get(key) || {
        count: 0,
        total: 0,
        name: tx.category_name || 'Sin categoría',
        color: tx.category_color || '#6b7280',
        icon: tx.category_icon || 'category'
      };
      existing.count += 1;
      existing.total += tx.amount;
      categoryMap.set(key, existing);
    });

    const totalAmount = Array.from(categoryMap.values()).reduce((sum, cat) => sum + cat.total, 0);

    return Array.from(categoryMap.entries()).map(([, cat]) => ({
      name: cat.name,
      value: cat.total,
      count: cat.count,
      percentage: totalAmount > 0 ? (cat.total / totalAmount * 100).toFixed(1) : 0
    }));
  }
}
