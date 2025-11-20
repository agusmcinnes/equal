import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ScheduledTransaction, ScheduledTransactionWithDetails, FREQUENCY_OPTIONS } from '../../models/scheduled-transaction.model';
import { Category } from '../../models/category.model';
import { Wallet } from '../../models/wallet.model';
import { ScheduledTransactionsService } from '../../services/scheduled-transactions.service';
import { DatetimePickerComponent } from '../datetime-picker/datetime-picker';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-scheduled-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DatetimePickerComponent],
  templateUrl: './scheduled-modal.html',
  styleUrl: './scheduled-modal.css'
})
export class ScheduledModalComponent implements OnInit, OnDestroy, OnChanges {
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

  ngOnChanges(changes: SimpleChanges): void {
    // When modal opens, reset form with correct values
    if (changes['isOpen'] && changes['isOpen'].currentValue === true) {
      this.errorMessage = '';

      if (this.mode === 'edit' && this.transaction) {
        // Edit mode: populate with transaction data
        this.populateForm(this.transaction);
      } else {
        // Create mode: reset form with default values
        this.form.reset({
          description: '',
          type: this.defaultType,
          amount: '',
          currency: 'ARS',
          category_id: '',
          wallet_id: null,
          start_date: '',
          end_date: '',
          frequency: 'monthly'
        });
      }
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
      category_id: ['', [Validators.required]],
      wallet_id: [null],
      start_date: ['', Validators.required],
      end_date: [''],
      frequency: ['monthly', Validators.required]
    }, { validators: this.endDateAfterStartDate });

    // Listen to type changes to reset category if it's not valid for the new type
    this.form.get('type')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      const currentCategoryId = this.form.get('category_id')?.value;
      if (currentCategoryId && currentCategoryId !== '') {
        const category = this.categories.find(c => c.id === currentCategoryId);
        if (category && category.type !== this.form.get('type')?.value) {
          this.form.patchValue({ category_id: '' });
        }
      }
    });

    // Listen to currency changes to reset wallet if it's not valid for the new currency
    this.form.get('currency')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      const currentWalletId = this.form.get('wallet_id')?.value;
      if (currentWalletId) {
        const wallet = this.wallets.find(w => w.id === currentWalletId);
        if (wallet && wallet.currency !== this.form.get('currency')?.value) {
          this.form.patchValue({ wallet_id: null });
        }
      }
    });
  }

  // Custom validator: end_date must be after start_date
  private endDateAfterStartDate(control: AbstractControl): ValidationErrors | null {
    const startDate = control.get('start_date')?.value;
    const endDate = control.get('end_date')?.value;

    if (!startDate || !endDate) {
      return null; // No validation if either is empty (end_date is optional)
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      return { endDateBeforeStart: true };
    }

    return null;
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

  onStartDateChange(value: string): void {
    this.form.patchValue({ start_date: value });
    this.form.get('start_date')?.markAsTouched();
  }

  onEndDateChange(value: string): void {
    this.form.patchValue({ end_date: value });
    this.form.get('end_date')?.markAsTouched();
  }

  get startDateValue(): string {
    return this.form.get('start_date')?.value || '';
  }

  get endDateValue(): string {
    return this.form.get('end_date')?.value || '';
  }

  onSubmit(): void {
    // Marcar todos los campos como touched para mostrar errores de validación
    Object.keys(this.form.controls).forEach(key => {
      this.form.get(key)?.markAsTouched();
    });

    if (this.form.invalid) {
      this.errorMessage = 'Por favor completa todos los campos requeridos correctamente';
      console.log('Form is invalid. Errors:', this.getFormValidationErrors());
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
      category_id: formValue.category_id && formValue.category_id !== '' ? formValue.category_id : null,
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
    this.isLoading = false;
    this.errorMessage = '';
    this.form.reset();
    this.close.emit();
  }

  getFilteredWallets(): Wallet[] {
    return this.wallets.filter(w => w.currency === this.form.get('currency')?.value);
  }

  getFilteredCategories(): Category[] {
    return this.categories.filter(c => c.type === this.form.get('type')?.value);
  }

  hasWalletsForCurrency(): boolean {
    return this.getFilteredWallets().length > 0;
  }

  get titleText(): string {
    return this.mode === 'create' ? 'Nueva Transacción Programada' : 'Editar Transacción Programada';
  }

  get submitButtonText(): string {
    return this.mode === 'create' ? 'Crear' : 'Guardar';
  }

  get isFormValid(): boolean {
    const isValid = this.form.valid;
    
    // Debug logging (remover después de solucionar el problema)
    console.log('=== Form Validation Check ===');
    console.log('Form valid:', this.form.valid);
    console.log('Form values:', this.form.value);
    console.log('Form errors:', this.getFormValidationErrors());
    console.log('Result (isFormValid):', isValid);
    console.log('=============================');
    
    return isValid;
  }

  private getFormValidationErrors(): any {
    const errors: any = {};
    Object.keys(this.form.controls).forEach(key => {
      const control = this.form.get(key);
      if (control && control.errors) {
        errors[key] = control.errors;
      }
    });
    if (this.form.errors) {
      errors['_form'] = this.form.errors;
    }
    return errors;
  }
}
