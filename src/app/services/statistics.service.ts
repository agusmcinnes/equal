import { Injectable } from '@angular/core';
import { TransactionWithDetails, TransactionStatistics } from '../models/transaction.model';

export interface PeriodComparison {
  current: number;
  previous: number;
  change: number;
  percentageChange: number;
}

export interface TrendAnalysis {
  direction: 'up' | 'down' | 'stable';
  strength: 'strong' | 'moderate' | 'weak';
  percentageChange: number;
}

@Injectable({
  providedIn: 'root'
})
export class StatisticsService {

  /**
   * Calculate basic statistics from transactions
   */
  calculateBasicStats(transactions: TransactionWithDetails[], currency: string = 'ARS'): TransactionStatistics {
    const filtered = transactions.filter(t => t.currency === currency);

    const income = filtered.filter(t => t.type === 'income');
    const expenses = filtered.filter(t => t.type === 'expense');

    const total_income = this.sum(income.map(t => t.amount));
    const total_expenses = this.sum(expenses.map(t => t.amount));

    return {
      total_income,
      total_expenses,
      net_balance: total_income - total_expenses,
      transaction_count: filtered.length,
      income_count: income.length,
      expense_count: expenses.length,
      currency,
      avg_income: income.length > 0 ? total_income / income.length : 0,
      avg_expense: expenses.length > 0 ? total_expenses / expenses.length : 0
    };
  }

  /**
   * Compare two periods
   */
  comparePeriods(currentPeriod: TransactionWithDetails[], previousPeriod: TransactionWithDetails[], metric: 'income' | 'expense' | 'net'): PeriodComparison {
    const currentStats = this.calculateBasicStats(currentPeriod);
    const previousStats = this.calculateBasicStats(previousPeriod);

    let current = 0;
    let previous = 0;

    switch (metric) {
      case 'income':
        current = currentStats.total_income;
        previous = previousStats.total_income;
        break;
      case 'expense':
        current = currentStats.total_expenses;
        previous = previousStats.total_expenses;
        break;
      case 'net':
        current = currentStats.net_balance;
        previous = previousStats.net_balance;
        break;
    }

    const change = current - previous;
    const percentageChange = previous !== 0 ? (change / previous) * 100 : 0;

    return {
      current,
      previous,
      change,
      percentageChange
    };
  }

  /**
   * Analyze trend from time series data
   */
  analyzeTrend(values: number[]): TrendAnalysis {
    if (values.length < 2) {
      return {
        direction: 'stable',
        strength: 'weak',
        percentageChange: 0
      };
    }

    // Simple linear regression slope calculation
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = this.average(values);

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean);
      denominator += Math.pow(i - xMean, 2);
    }

    const slope = numerator / denominator;
    const percentageChange = yMean !== 0 ? (slope / yMean) * 100 : 0;

    // Determine direction
    let direction: 'up' | 'down' | 'stable' = 'stable';
    if (Math.abs(percentageChange) > 5) {
      direction = percentageChange > 0 ? 'up' : 'down';
    }

    // Determine strength
    let strength: 'strong' | 'moderate' | 'weak' = 'weak';
    const absChange = Math.abs(percentageChange);
    if (absChange > 20) {
      strength = 'strong';
    } else if (absChange > 10) {
      strength = 'moderate';
    }

    return {
      direction,
      strength,
      percentageChange: Math.abs(percentageChange)
    };
  }

  /**
   * Group transactions by time period
   */
  groupByPeriod(transactions: TransactionWithDetails[], period: 'day' | 'week' | 'month' | 'year'): Map<string, TransactionWithDetails[]> {
    const groups = new Map<string, TransactionWithDetails[]>();

    transactions.forEach(tx => {
      const date = new Date(tx.date);
      let key: string;

      switch (period) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = this.getWeekStart(date);
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'year':
          key = String(date.getFullYear());
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(tx);
    });

    return groups;
  }

  /**
   * Calculate growth rate between two values
   */
  growthRate(oldValue: number, newValue: number): number {
    if (oldValue === 0) return 0;
    return ((newValue - oldValue) / oldValue) * 100;
  }

  /**
   * Calculate moving average
   */
  movingAverage(values: number[], window: number): number[] {
    if (values.length < window) return values;

    const result: number[] = [];
    for (let i = 0; i <= values.length - window; i++) {
      const windowValues = values.slice(i, i + window);
      result.push(this.average(windowValues));
    }

    return result;
  }

  /**
   * Find outliers using IQR method
   */
  findOutliers(values: number[]): number[] {
    const sorted = [...values].sort((a, b) => a - b);
    const q1Index = Math.floor(sorted.length * 0.25);
    const q3Index = Math.floor(sorted.length * 0.75);

    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];
    const iqr = q3 - q1;

    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    return values.filter(v => v < lowerBound || v > upperBound);
  }

  /**
   * Calculate percentage of total
   */
  percentageOfTotal(value: number, total: number): number {
    if (total === 0) return 0;
    return (value / total) * 100;
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount: number, currency: string = 'ARS', includeSymbol: boolean = true): string {
    const absAmount = Math.abs(amount);
    const formatted = new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(absAmount);

    if (!includeSymbol) return formatted;

    const symbols: { [key: string]: string } = {
      'ARS': '$',
      'USD': 'US$',
      'EUR': '€',
      'CRYPTO': '₿'
    };

    const symbol = symbols[currency] || '$';
    return `${symbol}${formatted}`;
  }

  /**
   * Format large numbers (1000 -> 1K, 1000000 -> 1M)
   */
  formatLargeNumber(num: number): string {
    const absNum = Math.abs(num);

    if (absNum >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (absNum >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }

    return num.toFixed(0);
  }

  /**
   * Get date range label
   */
  getDateRangeLabel(from: Date, to: Date): string {
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    const fromStr = from.toLocaleDateString('es-AR', options);
    const toStr = to.toLocaleDateString('es-AR', options);

    return `${fromStr} - ${toStr}`;
  }

  /**
   * Check if value is within percentage of target
   */
  isWithinTarget(value: number, target: number, tolerance: number = 10): boolean {
    const difference = Math.abs(value - target);
    const percentageDiff = (difference / target) * 100;
    return percentageDiff <= tolerance;
  }

  // ============ Private helper methods ============

  private sum(values: number[]): number {
    return values.reduce((acc, val) => acc + val, 0);
  }

  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return this.sum(values) / values.length;
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }

  /**
   * Get relative time label (Today, Yesterday, etc.)
   */
  getRelativeTimeLabel(date: Date): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - compareDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return 'Esta semana';
    if (diffDays < 14) return 'Semana pasada';
    if (diffDays < 30) return 'Este mes';
    if (diffDays < 60) return 'Mes pasado';

    return date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  }
}
