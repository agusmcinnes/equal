import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, take } from 'rxjs';
import { CategoriesService } from '../../services/categories.service';
import { TransactionsService } from '../../services/transactions.service';
import { StatisticsService } from '../../services/statistics.service';
import { Category } from '../../models/category.model';
import { CategoryDistribution, TransactionWithDetails } from '../../models/transaction.model';
import { EmptyStateComponent } from '../../components/empty-state/empty-state';
import { CustomSelectComponent, SelectOption } from '../../components/custom-select/custom-select';
import { NgxChartsModule } from '@swimlane/ngx-charts';

interface CategoryForm {
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon: string;
}

interface IconOption {
  icon: string;
  name: string;
}

@Component({
  selector: 'app-categories',
  imports: [CommonModule, FormsModule, EmptyStateComponent, CustomSelectComponent, NgxChartsModule],
  templateUrl: './categories.html',
  styleUrl: './categories.css'
})
export class Categories implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data
  categories: Category[] = [];
  incomeCategories: Category[] = [];
  expenseCategories: Category[] = [];

  // UI State
  loading = false;
  formVisible = false;
  editing: Category | null = null;
  searchQuery = '';
  filterType: 'all' | 'income' | 'expense' = 'all';
  deleteConfirmId: string | null = null;

  // Analytics
  showAnalytics = true;
  analyticsLoading = false;
  analyticsCurrency: 'ARS' | 'USD' | 'EUR' | 'CRYPTO' = 'ARS';
  incomeDistribution: CategoryDistribution[] = [];
  expenseDistribution: CategoryDistribution[] = [];
  incomeChartData: any[] = [];
  expenseChartData: any[] = [];
  incomeColorScheme: any = { domain: [] };
  expenseColorScheme: any = { domain: [] };

  currencyOptions: SelectOption[] = [
    { value: 'ARS', label: 'ARS', icon: 'attach_money' },
    { value: 'USD', label: 'USD', icon: 'attach_money' },
    { value: 'EUR', label: 'EUR', icon: 'euro' },
    { value: 'CRYPTO', label: 'CRYPTO', icon: 'currency_bitcoin' }
  ];

  // Form model
  model: CategoryForm = this.getEmptyModel();
  fieldErrors: { [k: string]: string } = {};

  // Available icons for Material Icons
  availableIcons: IconOption[] = [
    { icon: 'shopping_cart', name: 'Compras' },
    { icon: 'restaurant', name: 'Comida' },
    { icon: 'directions_car', name: 'Transporte' },
    { icon: 'home', name: 'Hogar' },
    { icon: 'favorite', name: 'Salud' },
    { icon: 'school', name: 'Educación' },
    { icon: 'movie', name: 'Entretenimiento' },
    { icon: 'flight', name: 'Viajes' },
    { icon: 'sports_soccer', name: 'Deportes' },
    { icon: 'work', name: 'Trabajo' },
    { icon: 'attach_money', name: 'Dinero' },
    { icon: 'savings', name: 'Ahorros' },
    { icon: 'card_giftcard', name: 'Regalos' },
    { icon: 'pets', name: 'Mascotas' },
    { icon: 'restaurant_menu', name: 'Restaurante' },
    { icon: 'local_bar', name: 'Bebidas' },
    { icon: 'build', name: 'Reparaciones' },
    { icon: 'trending_up', name: 'Ingresos' },
    { icon: 'business', name: 'Negocio' },
    { icon: 'card_travel', name: 'Tarjeta' }
  ];

  // Color palette
  colorPalette = [
    '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e',
    '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
    '#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e'
  ];

  constructor(
    private catService: CategoriesService,
    private txService: TransactionsService,
    public statsService: StatisticsService
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadDistributionData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadCategories(): Promise<void> {
    this.loading = true;
    try {
      const { data, error } = await this.catService.list();
      if (error) {
        console.error('Error loading categories:', error);
        this.categories = [];
      } else {
        this.categories = data || [];
        this.updateFilteredCategories();
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      this.categories = [];
    } finally {
      this.loading = false;
    }
  }

  updateFilteredCategories(): void {
    this.incomeCategories = this.categories.filter((c: Category) => c.type === 'income');
    this.expenseCategories = this.categories.filter((c: Category) => c.type === 'expense');
  }

  getFilteredCategories(): Category[] {
    let filtered = this.categories;

    if (this.filterType !== 'all') {
      filtered = filtered.filter((c: Category) => c.type === this.filterType);
    }

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter((c: Category) => c.name.toLowerCase().includes(query));
    }

    return filtered.sort((a: Category, b: Category) => (a.name || '').localeCompare(b.name || ''));
  }

  showForm(edit?: Category): void {
    if (edit) {
      this.editing = edit;
      this.model = {
        name: edit.name || '',
        type: edit.type || 'expense',
        color: edit.color || '#463397',
        icon: edit.icon || 'category'
      };
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

  cancelDelete(): void {
    this.deleteConfirmId = null;
  }

  validateModel(): boolean {
    this.fieldErrors = {};
    if (!this.model.name || this.model.name.trim() === '') {
      this.fieldErrors['name'] = 'El nombre es requerido';
    }
    if (!this.model.type) {
      this.fieldErrors['type'] = 'Seleccione un tipo';
    }
    if (!this.model.color) {
      this.fieldErrors['color'] = 'Seleccione un color';
    }
    if (!this.model.icon) {
      this.fieldErrors['icon'] = 'Seleccione un icono';
    }
    return Object.keys(this.fieldErrors).length === 0;
  }

  async save(): Promise<void> {
    if (!this.validateModel()) return;

    this.loading = true;
    try {
      const categoryData: Category = {
        name: this.model.name,
        type: this.model.type,
        color: this.model.color,
        icon: this.model.icon
      };

      if (this.editing && this.editing.id) {
        const { error } = await this.catService.update(this.editing.id, categoryData);
        if (error) {
          console.error('Error updating category:', error);
          alert('Error al actualizar la categoría: ' + (typeof error === 'string' ? error : error.message));
          return;
        }
      } else {
        const { error } = await this.catService.create(categoryData);
        if (error) {
          console.error('Error creating category:', error);
          alert('Error al crear la categoría: ' + (typeof error === 'string' ? error : error.message));
          return;
        }
      }
      this.closeForm();
      await this.loadCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Error al guardar la categoría');
    } finally {
      this.loading = false;
    }
  }

  async delete(id: string): Promise<void> {
    if (!confirm('¿Está seguro de que desea eliminar esta categoría?')) return;

    this.loading = true;
    try {
      const { error } = await this.catService.delete(id);
      if (error) {
        console.error('Error deleting category:', error);
        alert('Error al eliminar la categoría: ' + (typeof error === 'string' ? error : error.message));
        return;
      }
      this.deleteConfirmId = null;
      await this.loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Error al eliminar la categoría');
    } finally {
      this.loading = false;
    }
  }

  getTypeLabel(type: string): string {
    return type === 'income' ? 'Ingreso' : 'Gasto';
  }

  getTypeIcon(type: string): string {
    return type === 'income' ? 'trending_up' : 'trending_down';
  }

  toggleAnalytics(): void {
    this.showAnalytics = !this.showAnalytics;
  }

  async loadDistributionData(): Promise<void> {
    this.analyticsLoading = true;

    try {
      // Load transactions from last 30 days, filtered by selected currency
      const allTransactions = await this.txService
        .listWithDetails({ currency: this.analyticsCurrency })
        .pipe(take(1))
        .toPromise() || [];

      // Filter for last 30 days
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentTransactions = allTransactions.filter((t: TransactionWithDetails) => {
        const txDate = new Date(t.date);
        return txDate >= thirtyDaysAgo && txDate <= today;
      });

      // Group by category for income
      const incomeMap = new Map<string, {
        category_id: string;
        category_name: string;
        category_color: string;
        category_icon: string;
        total_amount: number;
        transaction_count: number;
      }>();

      // Group by category for expense
      const expenseMap = new Map<string, {
        category_id: string;
        category_name: string;
        category_color: string;
        category_icon: string;
        total_amount: number;
        transaction_count: number;
      }>();

      recentTransactions.forEach((t: TransactionWithDetails) => {
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

      // Prepare chart data for horizontal bars (sorted by amount)
      this.incomeChartData = this.incomeDistribution
        .slice(0, 8)
        .map(item => ({
          name: item.category_name,
          value: item.total_amount,
          extra: {
            color: item.category_color,
            icon: item.category_icon,
            percentage: item.percentage
          }
        }));

      this.expenseChartData = this.expenseDistribution
        .slice(0, 8)
        .map(item => ({
          name: item.category_name,
          value: item.total_amount,
          extra: {
            color: item.category_color,
            icon: item.category_icon,
            percentage: item.percentage
          }
        }));

      // Build color schemes
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
      console.error('Error loading distribution data:', error);
      this.incomeDistribution = [];
      this.expenseDistribution = [];
      this.incomeChartData = [];
      this.expenseChartData = [];
    } finally {
      this.analyticsLoading = false;
    }
  }

  getFilteredIncomeDistribution(): CategoryDistribution[] {
    return this.incomeDistribution
      .sort((a, b) => b.total_amount - a.total_amount)
      .slice(0, 8);
  }

  getFilteredExpenseDistribution(): CategoryDistribution[] {
    return this.expenseDistribution
      .sort((a, b) => b.total_amount - a.total_amount)
      .slice(0, 8);
  }

  formatCurrency(amount: number): string {
    return this.statsService.formatCurrency(amount, this.analyticsCurrency);
  }

  changeAnalyticsCurrency(currency: 'ARS' | 'USD' | 'EUR' | 'CRYPTO'): void {
    this.analyticsCurrency = currency;
    this.loadDistributionData();
  }

  shouldShowIncomeAnalytics(): boolean {
    return this.filterType === 'all' || this.filterType === 'income';
  }

  shouldShowExpenseAnalytics(): boolean {
    return this.filterType === 'all' || this.filterType === 'expense';
  }

  hasAnalyticsData(): boolean {
    if (this.filterType === 'income') {
      return this.incomeDistribution.length > 0;
    }
    if (this.filterType === 'expense') {
      return this.expenseDistribution.length > 0;
    }
    return this.incomeDistribution.length > 0 || this.expenseDistribution.length > 0;
  }

  private getEmptyModel(): CategoryForm {
    return {
      name: '',
      type: 'expense',
      color: '#463397',
      icon: 'category'
    };
  }
}
