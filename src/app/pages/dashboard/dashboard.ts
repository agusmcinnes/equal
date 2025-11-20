import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject, takeUntil, take } from 'rxjs';
import { TransactionsService } from '../../services/transactions.service';
import { CategoriesService } from '../../services/categories.service';
import { WalletsService } from '../../services/wallets.service';
import { StatisticsService } from '../../services/statistics.service';
import {
  TransactionWithDetails,
  TransactionStatistics,
  CategoryDistribution
} from '../../models/transaction.model';
import { Category } from '../../models/category.model';
import { Wallet, WalletWithBalance } from '../../models/wallet.model';
import { StatCardComponent } from '../../components/stat-card/stat-card';
import { CategoryBadgeComponent } from '../../components/category-badge/category-badge';
import { EmptyStateComponent } from '../../components/empty-state/empty-state';
import { CustomSelectComponent, SelectOption } from '../../components/custom-select/custom-select';
import { NgxChartsModule } from '@swimlane/ngx-charts';

interface TopCategory {
  name: string;
  amount: number;
  percentage: number;
  color: string;
  icon: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    StatCardComponent,
    CategoryBadgeComponent,
    EmptyStateComponent,
    CustomSelectComponent,
    NgxChartsModule
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data
  recentTransactions: TransactionWithDetails[] = [];
  allTransactions: TransactionWithDetails[] = [];
  categories: Category[] = [];
  wallets: WalletWithBalance[] = [];

  // Statistics
  statistics: TransactionStatistics | null = null;
  topExpenses: TopCategory[] = [];
  totalWalletBalance = 0;
  walletBalancesByCurrency: { [key: string]: number } = {};

  // Multi-currency stats (when filterCurrency === 'all')
  multiCurrencyStats: { [key: string]: { income: number; expenses: number; balance: number } } = {};

  // Charts data
  topExpensesChartData: any[] = [];

  // UI State
  loading = false;
  statsLoading = false;
  filterCurrency: 'all' | 'ARS' | 'USD' | 'EUR' | 'CRYPTO' = 'all';

  currencyOptions: SelectOption[] = [
    { value: 'all', label: 'Todas', icon: 'currency_exchange' },
    { value: 'ARS', label: 'ARS', icon: 'attach_money' },
    { value: 'USD', label: 'USD', icon: 'attach_money' },
    { value: 'EUR', label: 'EUR', icon: 'euro' },
    { value: 'CRYPTO', label: 'CRYPTO', icon: 'currency_bitcoin' }
  ];

    // Chart options
  colorScheme: any = {
    domain: ['#10b981', '#ef4444', '#463397']
  };

  // Color scheme for expenses
  expenseCategoryColorScheme: any = {
    domain: ['#ef4444', '#f87171', '#fca5a5', '#fecaca', '#fee2e2', '#dc2626', '#b91c1c', '#991b1b']
  };

  constructor(
    private txService: TransactionsService,
    private catService: CategoriesService,
    private walletsService: WalletsService,
    public statsService: StatisticsService,
    private router: Router
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

    // Load categories
    await this.loadCategories();

    // Load wallets and calculate balance
    await this.loadWallets();

    // Load transactions
    await this.loadTransactions();

    // Calculate statistics and trends
    this.calculateStatistics();
    this.calculateTopExpenses();

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
          await this.catService.create({
            name: d.name,
            type: d.type,
            color: d.color,
            icon: d.icon
          } as any);
        }
        const { data: after } = await this.catService.list();
        this.categories = after || [];
      }
    }
  }

  async loadWallets(): Promise<void> {
    this.wallets = (await this.walletsService.listWithBalance().pipe(take(1)).toPromise()) || [];

    // Calculate balances by currency
    this.calculateWalletBalances();
  }

  calculateWalletBalances(): void {
    const currencies = ['ARS', 'USD', 'EUR', 'CRYPTO'];
    this.walletBalancesByCurrency = {};

    currencies.forEach(curr => {
      const walletsForCurrency = this.wallets.filter(w => w.currency === curr);
      if (walletsForCurrency.length > 0) {
        const balance = walletsForCurrency.reduce((sum, w) => sum + (w.current_balance || 0), 0);
        this.walletBalancesByCurrency[curr] = balance;
      }
    });

    // Calculate total for single currency view
    if (this.filterCurrency !== 'all') {
      this.totalWalletBalance = this.walletBalancesByCurrency[this.filterCurrency] || 0;
    } else {
      // For 'all', we don't sum different currencies together
      this.totalWalletBalance = 0;
    }
  }

  async loadTransactions(): Promise<void> {
    this.statsLoading = true;

    try {
      const data = await this.txService.listWithDetails()
        .pipe(take(1))
        .toPromise();

      if (!data) {
        this.allTransactions = [];
        this.recentTransactions = [];
        this.statsLoading = false;
        return;
      }

      // Calculate date range for last 30 days
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Filter for selected currency and last 30 days
      this.allTransactions = data.filter((t: TransactionWithDetails) => {
        // Filter by last 30 days
        const txDate = new Date(t.date);
        if (txDate < thirtyDaysAgo || txDate > today) return false;

        // Filter by currency (if not 'all')
        if (this.filterCurrency !== 'all' && t.currency !== this.filterCurrency) return false;

        return true;
      });

      // Get recent 5 transactions
      this.recentTransactions = this.allTransactions
        .sort((a: TransactionWithDetails, b: TransactionWithDetails) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);
    } catch (error) {
      console.error('Error loading transactions:', error);
      this.allTransactions = [];
      this.recentTransactions = [];
    } finally {
      this.statsLoading = false;
    }
  }

  calculateStatistics(): void {
    if (this.filterCurrency === 'all') {
      // Calculate stats for each currency separately
      this.multiCurrencyStats = {};
      const currencies = ['ARS', 'USD', 'EUR', 'CRYPTO'];

      currencies.forEach(curr => {
        const txForCurrency = this.allTransactions.filter(t => t.currency === curr);
        const income = txForCurrency.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expenses = txForCurrency.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

        if (income > 0 || expenses > 0) {
          this.multiCurrencyStats[curr] = {
            income: income,
            expenses: expenses,
            balance: income - expenses
          };
        }
      });

      // Set general statistics (for transaction count)
      this.statistics = {
        total_income: 0,
        total_expenses: 0,
        net_balance: 0,
        transaction_count: this.allTransactions.length,
        income_count: this.allTransactions.filter(t => t.type === 'income').length,
        expense_count: this.allTransactions.filter(t => t.type === 'expense').length,
        currency: 'all',
        avg_income: 0,
        avg_expense: 0
      };
    } else {
      // Single currency statistics
      this.multiCurrencyStats = {};
      const currency = this.filterCurrency;

      if (this.allTransactions.length === 0) {
        this.statistics = {
          total_income: 0,
          total_expenses: 0,
          net_balance: 0,
          transaction_count: 0,
          income_count: 0,
          expense_count: 0,
          currency: currency,
          avg_income: 0,
          avg_expense: 0
        };
      } else {
        this.statistics = this.statsService.calculateBasicStats(
          this.allTransactions,
          currency
        );
      }
    }
  }

  calculateTopExpenses(): void {
    const expenses = this.allTransactions.filter((t: TransactionWithDetails) => t.type === 'expense');
    const categoryMap = new Map<string, { amount: number; color: string; icon: string; categoryName: string }>();

    // Group by category name (not ID, so we keep the name)
    expenses.forEach((t: TransactionWithDetails) => {
      const categoryName = t.category_name || 'Sin categoría';
      const existing = categoryMap.get(categoryName) || {
        amount: 0,
        color: t.category_color || '#9CA3AF',
        icon: t.category_icon || 'category',
        categoryName: categoryName
      };
      existing.amount += t.amount;
      categoryMap.set(categoryName, existing);
    });

    // Sort and take top 5
    const sorted = Array.from(categoryMap.entries())
      .sort(([, a], [, b]) => b.amount - a.amount)
      .slice(0, 5);

    const totalExpenses = sorted.reduce((sum, [, data]) => sum + data.amount, 0);

    this.topExpenses = sorted.map(([categoryName, data]) => ({
      name: categoryName,
      amount: data.amount,
      percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
      color: data.color,
      icon: data.icon
    }));

    // Format for chart
    this.topExpensesChartData = this.topExpenses.map((cat) => ({
      name: cat.name,
      value: cat.amount
    }));
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short'
    });
  }

  navigateTo(route: string): void {
    this.router.navigate([`/${route}`]);
  }

  navigateToTransactions(): void {
    this.router.navigate(['/transactions']);
  }

  changeCurrencyFilter(currency: 'all' | 'ARS' | 'USD' | 'EUR' | 'CRYPTO'): void {
    this.filterCurrency = currency;
    this.calculateWalletBalances();
    this.loadTransactions().then(() => {
      this.calculateStatistics();
      this.calculateTopExpenses();
    });
  }

  formatCurrency(amount: number, currency: string): string {
    return this.statsService.formatCurrency(amount, currency);
  }

  getCurrencyKeys(): string[] {
    return Object.keys(this.multiCurrencyStats);
  }

  getWalletCurrencyKeys(): string[] {
    return Object.keys(this.walletBalancesByCurrency);
  }
}
