import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ScheduledTransaction, ScheduledTransactionWithDetails, FREQUENCY_OPTIONS } from '../../models/scheduled-transaction.model';
import { Category } from '../../models/category.model';
import { Wallet } from '../../models/wallet.model';
import { ScheduledTransactionsService } from '../../services/scheduled-transactions.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-scheduled-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './scheduled-modal.html',
  styleUrl: './scheduled-modal.css'
})
export class ScheduledModalComponent implements OnInit, OnDestroy {
  @Input() isOpen = false;
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() transaction: ScheduledTransactionWithDetails | null = null;
  @Input() categories: Category[] = [];
  @Input() wallets: Wallet[] = [];
  @Input() defaultType: 'income' | 'expense' = 'expense';

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<ScheduledTransaction>();

  form!: FormGroup;
  frequencyOptions = FREQUENCY_OPTIONS;
  isLoading = false;
  errorMessage = '';

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private scheduledTransactionsService: ScheduledTransactionsService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    if (this.transaction) {
      this.populateForm(this.transaction);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.form = this.fb.group({
      description: ['', [Validators.required, Validators.minLength(3)]],
      type: [this.defaultType, Validators.required],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      currency: ['ARS', Validators.required],
      category_id: [''],
      wallet_id: [''],
      start_date: ['', Validators.required],
      end_date: [''],
      frequency: ['monthly', Validators.required]
    });
  }

  private populateForm(transaction: ScheduledTransactionWithDetails): void {
    this.form.patchValue({
      description: transaction.description,
      type: transaction.type,
      amount: transaction.amount,
      currency: transaction.currency,
      category_id: transaction.category_id,
      wallet_id: transaction.wallet_id,
      start_date: this.formatDateForInput(transaction.start_date),
      end_date: transaction.end_date ? this.formatDateForInput(transaction.end_date) : '',
      frequency: transaction.frequency
    });
  }

  private formatDateForInput(dateString: string): string {
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16);
  }

  private formatDateForSubmission(dateString: string): string {
    const date = new Date(dateString);
    return date.toISOString();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.errorMessage = 'Por favor completa todos los campos requeridos correctamente';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const formValue = this.form.value;
    
    // Calcular próxima fecha de ejecución
    const startDate = new Date(formValue.start_date);
    const nextExecutionDate = this.scheduledTransactionsService.calculateNextExecutionDate(
      startDate,
      formValue.frequency
    );

    const transactionData: ScheduledTransaction = {
      ...(this.mode === 'edit' && this.transaction?.id && { id: this.transaction.id }),
      description: formValue.description.trim(),
      type: formValue.type,
      amount: parseFloat(formValue.amount),
      currency: formValue.currency,
      category_id: formValue.category_id || null,
      wallet_id: formValue.wallet_id || null,
      start_date: this.formatDateForSubmission(formValue.start_date),
      end_date: formValue.end_date ? this.formatDateForSubmission(formValue.end_date) : null,
      frequency: formValue.frequency,
      next_execution_date: nextExecutionDate.toISOString(),
      is_active: true
    };

    this.save.emit(transactionData);
  }

  onClose(): void {
    if (this.form.dirty && !confirm('¿Descartar cambios?')) {
      return;
    }
    this.close.emit();
  }

  getFilteredWallets(): Wallet[] {
    return this.wallets.filter(w => w.currency === this.form.get('currency')?.value);
  }

  getFilteredCategories(): Category[] {
    return this.categories.filter(c => c.type === this.form.get('type')?.value);
  }

  get titleText(): string {
    return this.mode === 'create' ? 'Nueva Transacción Programada' : 'Editar Transacción Programada';
  }

  get submitButtonText(): string {
    return this.mode === 'create' ? 'Crear' : 'Guardar';
  }

  get isFormValid(): boolean {
    return this.form.valid;
  }
}
