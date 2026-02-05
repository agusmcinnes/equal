import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DollarService, DollarRate } from '../../services/dollar.service';
import { CurrencyExchangeService } from '../../services/currency-exchange.service';
import { WalletsService } from '../../services/wallets.service';
import { WalletWithBalance } from '../../models/wallet.model';
import {
  ExchangePreview,
  ExchangeFormData,
  CurrencyExchangeWithDetails
} from '../../models/currency-exchange.model';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-dollar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dollar.html',
  styleUrl: './dollar.css'
})
export class DollarComponent implements OnInit, OnDestroy {
  // Dollar rates
  dollarRates: DollarRate[] = [];
  loading = true;
  error: string | null = null;
  lastUpdate: Date | null = null;

  // Wallets
  wallets: WalletWithBalance[] = [];
  arsWallets: WalletWithBalance[] = [];
  usdWallets: WalletWithBalance[] = [];

  // Exchange form
  operationType: 'buy_usd' | 'sell_usd' = 'buy_usd';
  amount: number = 0; // USD amount (calculated)
  sourceAmount: number = 0; // Amount in source currency (user input)
  rateSource: 'blue' | 'oficial' | 'custom' = 'blue';
  customRate: number = 0;
  sourceWalletId: string = '';
  destinationWalletId: string = '';
  notes: string = '';

  // Preview
  preview: ExchangePreview | null = null;

  // Exchange history
  exchanges: CurrencyExchangeWithDetails[] = [];
  loadingExchanges = false;

  // UI state
  submitting = false;
  successMessage: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private dollarService: DollarService,
    private currencyExchangeService: CurrencyExchangeService,
    private walletsService: WalletsService
  ) {}

  ngOnInit(): void {
    this.loadDollarRates();
    this.loadWallets();
    this.loadExchangeHistory();

    // Auto-refresh rates every 30 seconds
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadDollarRates());
  }

  private loadDollarRates(): void {
    this.dollarService.getDollarRates()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rates: DollarRate[]) => {
          this.dollarRates = rates;
          this.lastUpdate = new Date();
          this.loading = false;
          this.error = null;

          // Set initial custom rate from blue if available
          const blueRate = rates.find(r => r.currency === 'Blue');
          if (blueRate && this.customRate === 0) {
            this.customRate = blueRate.sell;
          }

          this.updatePreview();
        },
        error: (err: any) => {
          console.error('Error loading dollar rates:', err);
          this.error = 'Error al cargar las cotizaciones del dólar.';
          this.loading = false;
        }
      });
  }

  private loadWallets(): void {
    this.walletsService.listWithBalance()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (wallets: WalletWithBalance[]) => {
          this.wallets = wallets;
          this.arsWallets = wallets.filter(w => w.currency === 'ARS');
          this.usdWallets = wallets.filter(w => w.currency === 'USD');

          // Auto-select first wallet if available
          if (this.operationType === 'buy_usd') {
            if (this.arsWallets.length > 0 && !this.sourceWalletId) {
              this.sourceWalletId = this.arsWallets[0].id!;
            }
            if (this.usdWallets.length > 0 && !this.destinationWalletId) {
              this.destinationWalletId = this.usdWallets[0].id!;
            }
          } else {
            if (this.usdWallets.length > 0 && !this.sourceWalletId) {
              this.sourceWalletId = this.usdWallets[0].id!;
            }
            if (this.arsWallets.length > 0 && !this.destinationWalletId) {
              this.destinationWalletId = this.arsWallets[0].id!;
            }
          }
        },
        error: (err: any) => {
          console.error('Error loading wallets:', err);
        }
      });
  }

  loadExchangeHistory(): void {
    this.loadingExchanges = true;
    this.currencyExchangeService.listExchanges()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (exchanges) => {
          this.exchanges = exchanges;
          this.loadingExchanges = false;
        },
        error: (err) => {
          console.error('Error loading exchanges:', err);
          this.loadingExchanges = false;
        }
      });
  }

  onOperationTypeChange(): void {
    // Swap wallet selections when operation type changes
    if (this.operationType === 'buy_usd') {
      // Buying USD: source = ARS, destination = USD
      this.sourceWalletId = this.arsWallets.length > 0 ? this.arsWallets[0].id! : '';
      this.destinationWalletId = this.usdWallets.length > 0 ? this.usdWallets[0].id! : '';
    } else {
      // Selling USD: source = USD, destination = ARS
      this.sourceWalletId = this.usdWallets.length > 0 ? this.usdWallets[0].id! : '';
      this.destinationWalletId = this.arsWallets.length > 0 ? this.arsWallets[0].id! : '';
    }
    // Reset amounts when changing operation type
    this.sourceAmount = 0;
    this.amount = 0;
    this.updatePreview();
  }

  onRateSourceChange(source: 'blue' | 'oficial' | 'custom'): void {
    this.rateSource = source;
    this.updateAmountFromSource();
  }

  useRate(rateType: 'Oficial' | 'Blue'): void {
    const rate = this.dollarRates.find(r => r.currency === rateType);
    if (rate) {
      this.rateSource = rateType.toLowerCase() as 'blue' | 'oficial';
      this.updatePreview();
    }
  }

  updatePreview(): void {
    if (!this.sourceAmount || this.sourceAmount <= 0) {
      this.preview = null;
      return;
    }

    const rate = this.getSelectedRate();
    if (!rate || rate <= 0) {
      this.preview = null;
      return;
    }

    // Calculate the USD amount for the preview
    let usdAmount: number;
    if (this.operationType === 'buy_usd') {
      usdAmount = this.sourceAmount / rate;
    } else {
      usdAmount = this.sourceAmount;
    }

    this.preview = this.currencyExchangeService.calculatePreview(
      this.operationType,
      usdAmount,
      rate,
      this.rateSource
    );
  }

  getSelectedRate(): number {
    if (this.rateSource === 'custom') {
      return this.customRate;
    }

    const rateLabel = this.rateSource === 'blue' ? 'Blue' : 'Oficial';
    const rate = this.dollarRates.find(r => r.currency === rateLabel);

    if (!rate) return 0;

    // Use sell rate for buying USD, buy rate for selling USD
    return this.operationType === 'buy_usd' ? rate.sell : rate.buy;
  }

  getRateByType(type: 'Oficial' | 'Blue'): DollarRate | undefined {
    return this.dollarRates.find(r => r.currency === type);
  }

  get sourceWallets(): WalletWithBalance[] {
    return this.operationType === 'buy_usd' ? this.arsWallets : this.usdWallets;
  }

  get destinationWallets(): WalletWithBalance[] {
    return this.operationType === 'buy_usd' ? this.usdWallets : this.arsWallets;
  }

  // Balance validation getters
  get sourceWallet(): WalletWithBalance | undefined {
    return this.wallets.find(w => w.id === this.sourceWalletId);
  }

  get destinationWallet(): WalletWithBalance | undefined {
    return this.wallets.find(w => w.id === this.destinationWalletId);
  }

  // Use transaction_total (net balance without initial) as the limit
  get sourceWalletBalance(): number {
    return this.sourceWallet?.transaction_total || 0;
  }

  get hasInsufficientBalance(): boolean {
    if (!this.sourceWalletId) return false;
    return this.sourceAmount > this.sourceWalletBalance;
  }

  // Max source amount is simply the wallet balance
  get maxSourceAmount(): number {
    return this.sourceWalletBalance;
  }

  // Calculate destination amount based on source amount and rate
  get destinationAmount(): number {
    const rate = this.getSelectedRate();
    if (rate <= 0 || this.sourceAmount <= 0) return 0;

    if (this.operationType === 'buy_usd') {
      // Buying USD: sourceAmount (ARS) / rate = USD
      return this.sourceAmount / rate;
    } else {
      // Selling USD: sourceAmount (USD) * rate = ARS
      return this.sourceAmount * rate;
    }
  }

  // Use all available balance
  useMaxAmount(): void {
    this.sourceAmount = Math.floor(this.maxSourceAmount * 100) / 100;
    this.updateAmountFromSource();
  }

  // Slider step calculation based on source currency
  get sliderStep(): number {
    const max = this.maxSourceAmount;
    if (this.operationType === 'buy_usd') {
      // ARS - larger steps
      if (max <= 10000) return 100;
      if (max <= 100000) return 500;
      if (max <= 1000000) return 1000;
      return 5000;
    } else {
      // USD - smaller steps
      if (max <= 100) return 1;
      if (max <= 1000) return 5;
      if (max <= 10000) return 10;
      return 50;
    }
  }

  // Update USD amount from source amount
  updateAmountFromSource(): void {
    const rate = this.getSelectedRate();
    if (rate <= 0) {
      this.amount = 0;
      this.updatePreview();
      return;
    }

    if (this.operationType === 'buy_usd') {
      // sourceAmount is ARS, calculate USD
      this.amount = this.sourceAmount / rate;
    } else {
      // sourceAmount is USD
      this.amount = this.sourceAmount;
    }
    this.updatePreview();
  }

  // Handle source amount change and cap at max
  onSourceAmountChange(): void {
    const max = this.maxSourceAmount;
    if (this.sourceAmount > max) {
      this.sourceAmount = Math.floor(max * 100) / 100;
    }
    if (this.sourceAmount < 0) {
      this.sourceAmount = 0;
    }
    this.updateAmountFromSource();
  }

  get canSubmit(): boolean {
    return (
      this.sourceAmount > 0 &&
      this.getSelectedRate() > 0 &&
      !!this.sourceWalletId &&
      !!this.destinationWalletId &&
      !this.submitting &&
      !this.hasInsufficientBalance
    );
  }

  async submitExchange(): Promise<void> {
    if (!this.canSubmit) return;

    this.submitting = true;
    this.error = null;
    this.successMessage = null;

    // Calculate USD amount for the exchange
    let usdAmount: number;
    if (this.operationType === 'buy_usd') {
      usdAmount = this.sourceAmount / this.getSelectedRate();
    } else {
      usdAmount = this.sourceAmount;
    }

    const formData: ExchangeFormData = {
      operation_type: this.operationType,
      amount: usdAmount,
      exchange_rate: this.getSelectedRate(),
      rate_source: this.rateSource,
      source_wallet_id: this.sourceWalletId,
      destination_wallet_id: this.destinationWalletId,
      notes: this.notes || undefined
    };

    const result = await this.currencyExchangeService.executeExchange(formData);

    this.submitting = false;

    if (result.success) {
      this.successMessage = this.operationType === 'buy_usd'
        ? `Compraste ${this.formatCurrency(this.destinationAmount, 'USD')} exitosamente`
        : `Vendiste ${this.formatCurrency(this.sourceAmount, 'USD')} exitosamente`;

      // Reset form
      this.amount = 0;
      this.sourceAmount = 0;
      this.notes = '';

      // Reload data
      this.loadWallets();
      this.loadExchangeHistory();

      // Clear success message after 5 seconds
      setTimeout(() => {
        this.successMessage = null;
      }, 5000);
    } else {
      this.error = result.error || 'Error al realizar el cambio';
    }
  }

  async deleteExchange(exchange: CurrencyExchangeWithDetails): Promise<void> {
    if (!confirm('¿Estás seguro de eliminar este cambio? Se eliminarán también las transacciones asociadas.')) {
      return;
    }

    const result = await this.currencyExchangeService.deleteExchange(exchange.id!);

    if (result.success) {
      this.loadWallets();
      this.loadExchangeHistory();
    } else {
      this.error = result.error || 'Error al eliminar el cambio';
    }
  }

  formatCurrency(value: number, currency: string = 'ARS'): string {
    if (currency === 'USD') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(value);
    }
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  formatTime(date: Date | string): string {
    if (!date) return 'N/A';
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(d);
  }

  formatDate(date: string): string {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit'
    }).format(new Date(date));
  }

  getDifference(buy: number, sell: number): number {
    if (buy === 0) return 0;
    return ((sell - buy) / buy) * 100;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
