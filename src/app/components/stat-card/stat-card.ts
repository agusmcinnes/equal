import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  templateUrl: './stat-card.html',
  styleUrls: ['./stat-card.css'],
  standalone: true,
  imports: [CommonModule]
})
export class StatCardComponent {
  @Input() title: string = '';
  @Input() value: string | number = '';
  @Input() icon: string = 'analytics';
  @Input() iconColor: string = 'gradient';
  @Input() trend?: number; // Percentage change (positive or negative)
  @Input() loading: boolean = false;
  @Input() currency: string | undefined = undefined;

  get Math() {
    return Math;
  }

  get formattedValue(): string {
    if (typeof this.value === 'number') {
      // Only format as currency if currency is explicitly provided
      if (this.currency) {
        return this.formatCurrency(this.value);
      }
      // Otherwise just format as number
      return this.formatNumber(this.value);
    }
    return this.value.toString();
  }

  get trendDirection(): 'up' | 'down' | 'neutral' {
    if (!this.trend || this.trend === 0) return 'neutral';
    return this.trend > 0 ? 'up' : 'down';
  }

  get trendIcon(): string {
    if (this.trendDirection === 'up') return 'trending_up';
    if (this.trendDirection === 'down') return 'trending_down';
    return 'remove';
  }

  private formatCurrency(amount: number): string {
    const symbol = this.getCurrencySymbol(this.currency || 'ARS');
    const sign = amount < 0 ? '-' : '';
    return `${sign}${symbol}${this.formatNumber(Math.abs(amount))}`;
  }

  private formatNumber(num: number): string {
    return new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(num);
  }

  private getCurrencySymbol(currency: string): string {
    const symbols: { [key: string]: string } = {
      'ARS': '$',
      'USD': 'US$',
      'EUR': '€',
      'CRYPTO': '₿'
    };
    return symbols[currency] || '$';
  }
}
