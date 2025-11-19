import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DollarService, DollarRate } from '../../services/dollar.service';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-dollar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dollar.html',
  styleUrl: './dollar.css'
})
export class DollarComponent implements OnInit, OnDestroy {
  dollarRates: DollarRate[] = [];
  loading = true;
  error: string | null = null;
  lastUpdate: Date | null = null;

  private destroy$ = new Subject<void>();

  constructor(private dollarService: DollarService) {}

  ngOnInit(): void {
    this.loadDollarRates();
    // Set up auto-refresh every 30 seconds
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadDollarRates());
  }

  private loadDollarRates(): void {
    this.dollarService.getDollarRates()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rates: any) => {
          console.log('Rates received:', rates);
          this.dollarRates = rates;
          this.lastUpdate = new Date();
          this.loading = false;
          this.error = null;
        },
        error: (err: any) => {
          console.error('Error loading dollar rates:', err);
          this.error = 'Error al cargar las cotizaciones del dólar. Verifica tu conexión.';
          this.loading = false;
        }
      });
  }

  getDifference(buy: number, sell: number): number {
    if (buy === 0) return 0;
    return ((sell - buy) / buy) * 100;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  formatTime(date: Date): string {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(date));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
