import { Component, Input, Output, EventEmitter, ElementRef, HostListener, forwardRef, OnChanges, SimpleChanges, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SelectOption {
  value: any;
  label: string;
  icon?: string;
}

@Component({
  selector: 'app-custom-select',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './custom-select.html',
  styleUrl: './custom-select.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomSelectComponent),
      multi: true
    }
  ]
})
export class CustomSelectComponent implements ControlValueAccessor, OnChanges {
  @Input() options: SelectOption[] = [];
  @Input() placeholder: string = 'Seleccionar...';
  @Input() disabled: boolean = false;
  @Input() loading: boolean = false;
  @Output() selectionChange = new EventEmitter<any>();

  isOpen = false;
  openUpward = false;
  selectedOption: SelectOption | null = null;
  private value: any = null;

  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(
    private elementRef: ElementRef,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['options'] && this.value !== null && this.value !== undefined) {
      this.selectedOption = this.options.find(opt => opt.value === this.value) || null;
      this.cdr.markForCheck();
    }
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target) && this.isOpen) {
      this.isOpen = false;
      this.cdr.markForCheck();
    }
  }

  toggleDropdown(event: Event) {
    event.stopPropagation();
    if (!this.disabled && !this.loading) {
      if (!this.isOpen) {
        // Calculate if we should open upward
        const rect = this.elementRef.nativeElement.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const dropdownHeight = 280; // max-height of dropdown

        this.openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
      }
      this.isOpen = !this.isOpen;
      this.cdr.markForCheck();
    }
  }

  closeDropdown() {
    this.isOpen = false;
    this.cdr.markForCheck();
  }

  selectOption(option: SelectOption) {
    this.selectedOption = option;
    this.value = option.value;
    this.onChange(this.value);
    this.onTouched();
    this.selectionChange.emit(this.value);
    this.isOpen = false;
    this.cdr.markForCheck();
  }

  // ControlValueAccessor implementation
  writeValue(value: any): void {
    this.value = value;
    this.selectedOption = this.options.find(opt => opt.value === value) || null;
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (value: any) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  get displayLabel(): string {
    return this.selectedOption?.label || this.placeholder;
  }

  trackByValue(index: number, option: SelectOption): any {
    return option.value;
  }
}
