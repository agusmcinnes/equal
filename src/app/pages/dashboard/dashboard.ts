import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { Wallet } from '../../models/wallet.model';
import { StatCardComponent } from '../../components/stat-card/stat-card';
import { CategoryBadgeComponent } from '../../components/category-badge/category-badge';
import { EmptyStateComponent } from '../../components/empty-state/empty-state';
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
    RouterModule,
    StatCardComponent,
    CategoryBadgeComponent,
    EmptyStateComponent,
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
  wallets: Wallet[] = [];

  // Statistics
  statistics: TransactionStatistics | null = null;
  topExpenses: TopCategory[] = [];
  totalWalletBalance = 0;

  // Charts data
  topExpensesChartData: any[] = [];

  // UI State
  loading = false;
  statsLoading = false;

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
    this.wallets = (await this.walletsService.list().pipe(take(1)).toPromise()) || [];

    // Calculate total balance from all wallets
    this.totalWalletBalance = this.wallets.reduce((sum, w) => {
      const balance = typeof w.balance === 'number' ? w.balance : 0;
      return sum + balance;
    }, 0);
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

      // Filter for ARS currency and last 30 days (same logic as transactions page)
      this.allTransactions = data.filter((t: TransactionWithDetails) => {
        // Always filter to ARS currency
        if (t.currency !== 'ARS') return false;

        // Filter by last 30 days
        const txDate = new Date(t.date);
        if (txDate < thirtyDaysAgo || txDate > today) return false;

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
    if (this.allTransactions.length === 0) {
      this.statistics = {
        total_income: 0,
        total_expenses: 0,
        net_balance: 0,
        transaction_count: 0,
        income_count: 0,
        expense_count: 0,
        currency: 'ARS',
        avg_income: 0,
        avg_expense: 0
      };
    } else {
      this.statistics = this.statsService.calculateBasicStats(
        this.allTransactions,
        'ARS'
      );
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
}
