import { Component, Input, Output, EventEmitter, OnInit, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuickTransaction, QuickTransactionWithDetails } from '../../models/quick-transaction.model';
import { Category } from '../../models/category.model';
import { Wallet } from '../../models/wallet.model';
import { QuickTransactionsService } from '../../services/quick-transactions.service';
import { ModalStateService } from '../../shared/modal-state.service';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-quick-transaction-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quick-transaction-modal.html',
  styleUrl: './quick-transaction-modal.css'
})
export class QuickTransactionModalComponent implements OnInit, OnChanges, OnDestroy {
  @Input() isOpen = false;
  @Input() categories: Category[] = [];
  @Input() wallets: Wallet[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() transactionCreated = new EventEmitter<void>();

  activeTab: 'templates' | 'quick' = 'quick';

  // Templates
  templates: QuickTransactionWithDetails[] = [];
  templatesLoading = false;
  showNewTemplateForm = false;
  editingTemplate: QuickTransactionWithDetails | null = null;

  // New template form
  newTemplate: Partial<QuickTransaction> = {
    name: '',
    type: 'expense',
    amount: 0,
    currency: 'ARS',
    category_id: null,
    wallet_id: null
  };

  // Quick transaction form
  quickForm = {
    type: 'expense' as 'income' | 'expense',
    amount: 0,
    currency: 'ARS' as string,
    category_id: null as string | null,
    wallet_id: null as string | null
  };

  isLoading = false;
  errorMessage = '';
  successMessage = '';

  // Swipe gesture handling for mobile bottom sheet
  private touchStartY = 0;
  private touchCurrentY = 0;
  private isSwiping = false;

  constructor(
    private quickTransactionsService: QuickTransactionsService,
    private modalStateService: ModalStateService
  ) {}

  // Touch event handlers for swipe-to-close
  onTouchStart(event: TouchEvent): void {
    const target = event.target as HTMLElement;
    // Only enable swipe on handle or near the top of the modal
    if (target.closest('.modal-handle') || target.closest('.modal-header')) {
      this.touchStartY = event.touches[0].clientY;
      this.isSwiping = true;
    }
  }

  onTouchMove(event: TouchEvent): void {
    if (!this.isSwiping) return;
    this.touchCurrentY = event.touches[0].clientY;
  }

  onTouchEnd(event: TouchEvent): void {
    if (!this.isSwiping) return;

    const swipeDistance = this.touchCurrentY - this.touchStartY;
    const swipeThreshold = 100; // pixels

    if (swipeDistance > swipeThreshold) {
      this.onClose();
    }

    this.isSwiping = false;
    this.touchStartY = 0;
    this.touchCurrentY = 0;
  }

  ngOnInit(): void {
    this.loadTemplates();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']) {
      if (changes['isOpen'].currentValue === true) {
        this.modalStateService.openModal();
        this.resetState();
        this.loadTemplates();
      } else if (changes['isOpen'].previousValue === true && changes['isOpen'].currentValue === false) {
        this.modalStateService.closeModal();
      }
    }
  }

  ngOnDestroy(): void {
    // Ensure modal is closed when component is destroyed
    if (this.isOpen) {
      this.modalStateService.closeModal();
    }
  }

  private resetState(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.showNewTemplateForm = false;
    this.editingTemplate = null;
    this.quickForm = { type: 'expense', amount: 0, currency: 'ARS', category_id: null, wallet_id: null };
    this.newTemplate = { name: '', type: 'expense', amount: 0, currency: 'ARS', category_id: null, wallet_id: null };
  }

  loadTemplates(): void {
    this.templatesLoading = true;
    this.quickTransactionsService.list()
      .pipe(take(1))
      .subscribe({
        next: (templates) => {
          this.templates = templates;
          this.templatesLoading = false;
        },
        error: (error) => {
          console.error('Error loading templates:', error);
          this.templatesLoading = false;
        }
      });
  }

  setActiveTab(tab: 'templates' | 'quick'): void {
    this.activeTab = tab;
    this.errorMessage = '';
    this.successMessage = '';
  }

  // Templates tab methods
  async executeTemplate(template: QuickTransactionWithDetails): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    const { error } = await this.quickTransactionsService.execute(template);

    if (error) {
      this.errorMessage = 'Error al ejecutar la plantilla';
      this.isLoading = false;
      return;
    }

    this.successMessage = `Transacción "${template.name}" registrada`;
    this.isLoading = false;
    this.transactionCreated.emit();

    setTimeout(() => {
      this.onClose();
    }, 800);
  }

  toggleNewTemplateForm(): void {
    this.showNewTemplateForm = !this.showNewTemplateForm;
    this.editingTemplate = null;
    this.newTemplate = { name: '', type: 'expense', amount: 0, currency: 'ARS', category_id: null, wallet_id: null };
  }

  editTemplate(template: QuickTransactionWithDetails): void {
    this.editingTemplate = template;
    this.showNewTemplateForm = true;
    this.newTemplate = {
      name: template.name,
      type: template.type,
      amount: template.amount,
      currency: template.currency,
      category_id: template.category_id || null,
      wallet_id: template.wallet_id || null
    };
  }

  async saveTemplate(): Promise<void> {
    if (!this.newTemplate.name || !this.newTemplate.amount) {
      this.errorMessage = 'Completa todos los campos requeridos';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    if (this.editingTemplate) {
      // Update existing
      const { error } = await this.quickTransactionsService.update(
        this.editingTemplate.id!,
        this.newTemplate
      );

      if (error) {
        this.errorMessage = 'Error al actualizar la plantilla';
        this.isLoading = false;
        return;
      }
    } else {
      // Create new
      const { error } = await this.quickTransactionsService.create(
        this.newTemplate as QuickTransaction
      );

      if (error) {
        this.errorMessage = 'Error al crear la plantilla';
        this.isLoading = false;
        return;
      }
    }

    this.showNewTemplateForm = false;
    this.editingTemplate = null;
    this.newTemplate = { name: '', type: 'expense', amount: 0, currency: 'ARS', category_id: null, wallet_id: null };
    this.isLoading = false;
    this.loadTemplates();
  }

  async deleteTemplate(template: QuickTransactionWithDetails, event: Event): Promise<void> {
    event.stopPropagation();

    if (!confirm(`¿Eliminar plantilla "${template.name}"?`)) {
      return;
    }

    const { error } = await this.quickTransactionsService.delete(template.id!);

    if (error) {
      this.errorMessage = 'Error al eliminar la plantilla';
      return;
    }

    this.loadTemplates();
  }

  cancelTemplateForm(): void {
    this.showNewTemplateForm = false;
    this.editingTemplate = null;
    this.newTemplate = { name: '', type: 'expense', amount: 0, currency: 'ARS', category_id: null, wallet_id: null };
  }

  // Quick tab methods
  async submitQuickTransaction(): Promise<void> {
    if (!this.quickForm.amount || this.quickForm.amount <= 0) {
      this.errorMessage = 'Ingresa un monto válido';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const { error } = await this.quickTransactionsService.createQuick({
      type: this.quickForm.type,
      amount: this.quickForm.amount,
      currency: this.quickForm.currency,
      category_id: this.quickForm.category_id,
      wallet_id: this.quickForm.wallet_id
    });

    if (error) {
      this.errorMessage = 'Error al crear la transacción';
      this.isLoading = false;
      return;
    }

    this.successMessage = 'Transacción registrada';
    this.isLoading = false;
    this.transactionCreated.emit();

    setTimeout(() => {
      this.onClose();
    }, 800);
  }

  onClose(): void {
    this.resetState();
    this.close.emit();
  }

  formatCurrency(amount: number, currency: string): string {
    const symbols: { [key: string]: string } = {
      'ARS': '$',
      'USD': 'US$',
      'EUR': '€',
      'CRYPTO': '₿'
    };
    return `${symbols[currency] || '$'}${amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
  }

  getFilteredCategories(type: 'income' | 'expense'): Category[] {
    return this.categories.filter(c => c.type === type);
  }

  onQuickTypeChange(type: 'income' | 'expense'): void {
    this.quickForm.type = type;
    // Reset category if it doesn't match the new type
    if (this.quickForm.category_id) {
      const category = this.categories.find(c => c.id === this.quickForm.category_id);
      if (category && category.type !== type) {
        this.quickForm.category_id = null;
      }
    }
  }

  onTemplateTypeChange(type: 'income' | 'expense'): void {
    this.newTemplate.type = type;
    // Reset category if it doesn't match the new type
    if (this.newTemplate.category_id) {
      const category = this.categories.find(c => c.id === this.newTemplate.category_id);
      if (category && category.type !== type) {
        this.newTemplate.category_id = null;
      }
    }
  }

  getFilteredWallets(currency: string): Wallet[] {
    return this.wallets.filter(w => w.currency === currency);
  }

  onQuickCurrencyChange(currency: string): void {
    this.quickForm.currency = currency;
    // Reset wallet if it doesn't match the new currency
    if (this.quickForm.wallet_id) {
      const wallet = this.wallets.find(w => w.id === this.quickForm.wallet_id);
      if (wallet && wallet.currency !== currency) {
        this.quickForm.wallet_id = null;
      }
    }
  }

  onTemplateCurrencyChange(currency: string): void {
    this.newTemplate.currency = currency as any;
    // Reset wallet if it doesn't match the new currency
    if (this.newTemplate.wallet_id) {
      const wallet = this.wallets.find(w => w.id === this.newTemplate.wallet_id);
      if (wallet && wallet.currency !== currency) {
        this.newTemplate.wallet_id = null;
      }
    }
  }
}
