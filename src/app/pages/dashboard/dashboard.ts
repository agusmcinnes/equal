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
import { QuickTransactionModalComponent } from '../../components/quick-transaction-modal/quick-transaction-modal';
import { NgxChartsModule } from '@swimlane/ngx-charts';

interface TopCategory {
  name: string;
  amount: number;
  percentage: number;
  color: string;
  icon: string;
}

interface ChartDataItem {
  name: string;
  value: number;
  extra?: {
    color: string;
    icon: string;
  };
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
    QuickTransactionModalComponent,
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

  // Total balance (all transactions, no period filter)
  totalBalanceByCurrency: { [key: string]: { income: number; expenses: number; balance: number } } = {};

  // Multi-currency stats (when filterCurrency === 'all')
  multiCurrencyStats: { [key: string]: { income: number; expenses: number; balance: number } } = {};

  // Category distribution data
  incomeDistribution: CategoryDistribution[] = [];
  expenseDistribution: CategoryDistribution[] = [];
  incomeChartData: ChartDataItem[] = [];
  expenseChartData: ChartDataItem[] = [];
  distributionLoading = false;
  distributionCurrency: 'ARS' | 'USD' | 'EUR' | 'CRYPTO' = 'ARS';

  distributionCurrencyOptions: SelectOption[] = [
    { value: 'ARS', label: 'ARS', icon: 'attach_money' },
    { value: 'USD', label: 'USD', icon: 'attach_money' },
    { value: 'EUR', label: 'EUR', icon: 'euro' },
    { value: 'CRYPTO', label: 'CRYPTO', icon: 'currency_bitcoin' }
  ];

  // Charts data
  topExpensesChartData: any[] = [];

  // UI State
  loading = false;
  statsLoading = false;
  filterCurrency: 'all' | 'ARS' | 'USD' | 'EUR' | 'CRYPTO' = 'all';
  isQuickModalOpen = false;

  currencyOptions: SelectOption[] = [
    { value: 'all', label: 'Todas', icon: 'currency_exchange' },
    { value: 'ARS', label: 'ARS', icon: 'attach_money' },
    { value: 'USD', label: 'USD', icon: 'attach_money' },
    { value: 'EUR', label: 'EUR', icon: 'euro' },
    { value: 'CRYPTO', label: 'CRYPTO', icon: 'currency_bitcoin' }
  ];

  // Period filter
  filterPeriod: '7_days' | '30_days' | '90_days' | 'this_month' | 'last_month' | 'this_year' = '30_days';

  periodOptions: SelectOption[] = [
    { value: '7_days', label: 'Últimos 7 días', icon: 'schedule' },
    { value: '30_days', label: 'Últimos 30 días', icon: 'date_range' },
    { value: '90_days', label: 'Últimos 90 días', icon: 'calendar_month' },
    { value: 'this_month', label: 'Este mes', icon: 'today' },
    { value: 'last_month', label: 'Mes pasado', icon: 'event' },
    { value: 'this_year', label: 'Este año', icon: 'calendar_today' }
  ];

    // Chart options
  colorScheme: any = {
    domain: ['#10b981', '#ef4444', '#463397']
  };

  // Color scheme for expenses (fallback)
  expenseCategoryColorScheme: any = {
    domain: ['#ef4444', '#f87171', '#fca5a5', '#fecaca', '#fee2e2', '#dc2626', '#b91c1c', '#991b1b']
  };

  // Dynamic color schemes based on category colors
  incomeColorScheme: any = { domain: [] };
  expenseColorScheme: any = { domain: [] };

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

    // Calculate total balance from all transactions (no period filter)
    await this.calculateTotalBalance();

    // Load transactions (filtered by period)
    await this.loadTransactions();

    // Calculate statistics and trends
    this.calculateStatistics();
    this.calculateTopExpenses();

    // Calculate category distribution from loaded transactions
    this.calculateCategoryDistribution();

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

  async calculateTotalBalance(): Promise<void> {
    try {
      const data = await this.txService.listWithDetails()
        .pipe(take(1))
        .toPromise();

      if (!data) {
        this.totalBalanceByCurrency = {};
        return;
      }

      const currencies = ['ARS', 'USD', 'EUR', 'CRYPTO'];
      this.totalBalanceByCurrency = {};

      currencies.forEach(curr => {
        const txForCurrency = data.filter((t: TransactionWithDetails) => t.currency === curr);
        const income = txForCurrency.filter((t: TransactionWithDetails) => t.type === 'income').reduce((sum: number, t: TransactionWithDetails) => sum + t.amount, 0);
        const expenses = txForCurrency.filter((t: TransactionWithDetails) => t.type === 'expense').reduce((sum: number, t: TransactionWithDetails) => sum + t.amount, 0);

        if (income > 0 || expenses > 0) {
          this.totalBalanceByCurrency[curr] = {
            income,
            expenses,
            balance: income - expenses
          };
        }
      });
    } catch (error) {
      console.error('Error calculating total balance:', error);
      this.totalBalanceByCurrency = {};
    }
  }

  getTotalBalanceCurrencyKeys(): string[] {
    return Object.keys(this.totalBalanceByCurrency);
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

      // Calculate date range based on selected period
      const { start, end } = this.getDateRangeForPeriod();

      // Filter for selected currency and period
      this.allTransactions = data.filter((t: TransactionWithDetails) => {
        // Filter by selected period
        const txDate = new Date(t.date);
        if (txDate < start || txDate > end) return false;

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

  calculateCategoryDistribution(): void {
    this.distributionLoading = true;

    try {
      // Calculate distribution from allTransactions (already filtered by date)
      // Filter by the selected distributionCurrency for the charts

      // Filter transactions for the selected distribution currency
      const filteredTransactions = this.allTransactions.filter(t => t.currency === this.distributionCurrency);

      // Group income by category
      const incomeMap = new Map<string, {
        category_id: string;
        category_name: string;
        category_color: string;
        category_icon: string;
        total_amount: number;
        transaction_count: number;
      }>();

      // Group expense by category
      const expenseMap = new Map<string, {
        category_id: string;
        category_name: string;
        category_color: string;
        category_icon: string;
        total_amount: number;
        transaction_count: number;
      }>();

      filteredTransactions.forEach(t => {
        const categoryId = t.category_id || 'uncategorized';
        const categoryData = {
          category_id: categoryId,
          category_name: t.category_name || 'Sin categoría',
          category_color: t.category_color || '#6b7280',
          category_icon: t.category_icon || 'category',
          total_amount: 0,
          transaction_count: 0
        };

        if (t.type === 'income') {
          const existing = incomeMap.get(categoryId) || { ...categoryData };
          existing.total_amount += t.amount;
          existing.transaction_count += 1;
          incomeMap.set(categoryId, existing);
        } else {
          const existing = expenseMap.get(categoryId) || { ...categoryData };
          existing.total_amount += t.amount;
          existing.transaction_count += 1;
          expenseMap.set(categoryId, existing);
        }
      });

      // Calculate totals for percentages
      const totalIncome = Array.from(incomeMap.values()).reduce((sum, item) => sum + item.total_amount, 0);
      const totalExpense = Array.from(expenseMap.values()).reduce((sum, item) => sum + item.total_amount, 0);

      // Convert to CategoryDistribution arrays with percentages
      this.incomeDistribution = Array.from(incomeMap.values())
        .map(item => ({
          ...item,
          percentage: totalIncome > 0 ? (item.total_amount / totalIncome) * 100 : 0
        }))
        .sort((a, b) => b.total_amount - a.total_amount);

      this.expenseDistribution = Array.from(expenseMap.values())
        .map(item => ({
          ...item,
          percentage: totalExpense > 0 ? (item.total_amount / totalExpense) * 100 : 0
        }))
        .sort((a, b) => b.total_amount - a.total_amount);

      // Prepare chart data (limit to top 8)
      this.incomeChartData = this.incomeDistribution
        .slice(0, 8)
        .map(item => ({
          name: item.category_name,
          value: item.total_amount,
          extra: {
            color: item.category_color,
            icon: item.category_icon
          }
        }));

      this.expenseChartData = this.expenseDistribution
        .slice(0, 8)
        .map(item => ({
          name: item.category_name,
          value: item.total_amount,
          extra: {
            color: item.category_color,
            icon: item.category_icon
          }
        }));

      // Build dynamic color schemes from category colors
      this.incomeColorScheme = {
        domain: this.incomeChartData.length > 0
          ? this.incomeChartData.map(item => item.extra?.color || '#10b981')
          : ['#10b981']
      };

      this.expenseColorScheme = {
        domain: this.expenseChartData.length > 0
          ? this.expenseChartData.map(item => item.extra?.color || '#ef4444')
          : ['#ef4444']
      };

    } catch (error) {
      console.error('Error calculating category distribution:', error);
      this.incomeDistribution = [];
      this.expenseDistribution = [];
      this.incomeChartData = [];
      this.expenseChartData = [];
    } finally {
      this.distributionLoading = false;
    }
  }

  getDistributionCurrency(): string {
    return this.distributionCurrency;
  }

  changeDistributionCurrency(currency: 'ARS' | 'USD' | 'EUR' | 'CRYPTO'): void {
    this.distributionCurrency = currency;
    this.calculateCategoryDistribution();
  }

  getTopIncomeCategories(): CategoryDistribution[] {
    return this.incomeDistribution
      .sort((a, b) => b.total_amount - a.total_amount)
      .slice(0, 8);
  }

  getTopExpenseCategories(): CategoryDistribution[] {
    return this.expenseDistribution
      .sort((a, b) => b.total_amount - a.total_amount)
      .slice(0, 8);
  }

  navigateToCategoryTransactions(categoryId: string): void {
    this.router.navigate(['/transactions'], { queryParams: { category: categoryId } });
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short'
    });
  }

  getExchangeDisplay(tx: TransactionWithDetails): { title: string; detail: string } {
    const description = (tx.description || '').trim();
    const match = description.match(
      /Cambio\s+([A-Z]{3})\s+→\s+([A-Z]{3})\s+·\s+([\d.,]+)\s+([A-Z]{3})\s+·\s+Tasa\s+([\d.,]+)/i
    );

    if (match) {
      const fromCurrency = match[1].toUpperCase();
      const toCurrency = match[2].toUpperCase();
      const amount = match[3];
      const amountCurrency = match[4].toUpperCase();
      const rate = match[5];

      let title = `Cambio ${fromCurrency} → ${toCurrency}`;
      if (fromCurrency === 'ARS' && toCurrency === 'USD') {
        title = 'Compra USD';
      } else if (fromCurrency === 'USD' && toCurrency === 'ARS') {
        title = 'Venta USD';
      }

      return {
        title,
        detail: `${amount} ${amountCurrency} @ ${rate}`
      };
    }

    return {
      title: 'Cambio',
      detail: description || 'Sin descripción'
    };
  }

  navigateTo(route: string): void {
    this.router.navigate([`/${route}`]);
  }

  navigateToTransactions(): void {
    this.router.navigate(['/transactions']);
  }

  changeCurrencyFilter(currency: 'all' | 'ARS' | 'USD' | 'EUR' | 'CRYPTO'): void {
    this.filterCurrency = currency;
    // Sync distribution currency when a specific currency is selected
    if (currency !== 'all') {
      this.distributionCurrency = currency;
    }
    this.calculateWalletBalances();
    this.loadTransactions().then(() => {
      this.calculateStatistics();
      this.calculateTopExpenses();
      this.calculateCategoryDistribution();
    });
  }

  getDateRangeForPeriod(): { start: Date; end: Date } {
    const today = new Date();
    const end = new Date(today);
    let start = new Date(today);

    switch (this.filterPeriod) {
      case '7_days':
        start.setDate(start.getDate() - 7);
        break;
      case '30_days':
        start.setDate(start.getDate() - 30);
        break;
      case '90_days':
        start.setDate(start.getDate() - 90);
        break;
      case 'this_month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'last_month':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end.setDate(0); // Last day of previous month
        break;
      case 'this_year':
        start = new Date(today.getFullYear(), 0, 1);
        break;
    }

    return { start, end };
  }

  getPeriodLabel(): string {
    const option = this.periodOptions.find(o => o.value === this.filterPeriod);
    return option?.label || 'Últimos 30 días';
  }

  changePeriodFilter(period: string): void {
    this.filterPeriod = period as typeof this.filterPeriod;
    this.loadTransactions().then(() => {
      this.calculateStatistics();
      this.calculateTopExpenses();
      this.calculateCategoryDistribution();
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

  openQuickTransactionModal(): void {
    this.isQuickModalOpen = true;
  }

  closeQuickTransactionModal(): void {
    this.isQuickModalOpen = false;
  }

  onQuickTransactionCreated(): void {
    this.loadTransactions().then(() => {
      this.calculateStatistics();
      this.calculateTopExpenses();
      this.calculateCategoryDistribution();
    });
    this.loadWallets();
  }
}
