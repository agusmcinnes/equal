import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatetimePickerComponent } from '../datetime-picker/datetime-picker';

export interface DateRange {
  from: string; // ISO date
  to: string; // ISO date
  label?: string;
}

export type DateRangePreset = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom';

@Component({
  selector: 'app-date-range-picker',
  templateUrl: './date-range-picker.html',
  styleUrls: ['./date-range-picker.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, DatetimePickerComponent]
})
export class DateRangePickerComponent implements OnInit {
  @Input() from: string | undefined = '';
  @Input() to: string | undefined = '';
  @Input() label: string = 'Rango de fechas';
  @Output() dateRangeChange = new EventEmitter<DateRange>();

  isOpen: boolean = false;
  selectedPreset: DateRangePreset = 'thisMonth';
  customFrom: string = '';
  customTo: string = '';

  presets = [
    { value: 'today' as DateRangePreset, label: 'Hoy', icon: 'today' },
    { value: 'yesterday' as DateRangePreset, label: 'Ayer', icon: 'event' },
    { value: 'thisWeek' as DateRangePreset, label: 'Esta semana', icon: 'date_range' },
    { value: 'lastWeek' as DateRangePreset, label: 'Semana pasada', icon: 'date_range' },
    { value: 'thisMonth' as DateRangePreset, label: 'Este mes', icon: 'calendar_month' },
    { value: 'lastMonth' as DateRangePreset, label: 'Mes pasado', icon: 'calendar_month' },
    { value: 'thisYear' as DateRangePreset, label: 'Este año', icon: 'calendar_today' },
    { value: 'custom' as DateRangePreset, label: 'Personalizado', icon: 'edit_calendar' }
  ];

  ngOnInit(): void {
    if (this.from && this.to) {
      this.customFrom = this.from;
      this.customTo = this.to;
    } else {
      this.applyPreset('thisMonth');
    }
  }

  togglePicker(): void {
    this.isOpen = !this.isOpen;
  }

  closePicker(): void {
    this.isOpen = false;
  }

  selectPreset(preset: DateRangePreset): void {
    this.selectedPreset = preset;
    if (preset !== 'custom') {
      this.applyPreset(preset);
    }
  }

  applyPreset(preset: DateRangePreset): void {
    const now = new Date();
    let from: Date;
    let to: Date = new Date(now);
    let label: string = '';

    switch (preset) {
      case 'today':
        from = new Date(now);
        label = 'Hoy';
        break;

      case 'yesterday':
        from = new Date(now.setDate(now.getDate() - 1));
        to = new Date(from);
        label = 'Ayer';
        break;

      case 'thisWeek':
        from = new Date(now);
        from.setDate(now.getDate() - now.getDay());
        label = 'Esta semana';
        break;

      case 'lastWeek':
        const lastWeek = new Date(now.setDate(now.getDate() - 7));
        from = new Date(lastWeek);
        from.setDate(lastWeek.getDate() - lastWeek.getDay());
        to = new Date(from);
        to.setDate(from.getDate() + 6);
        label = 'Semana pasada';
        break;

      case 'thisMonth':
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        label = 'Este mes';
        break;

      case 'lastMonth':
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        to = new Date(now.getFullYear(), now.getMonth(), 0);
        label = 'Mes pasado';
        break;

      case 'thisYear':
        from = new Date(now.getFullYear(), 0, 1);
        to = new Date(now.getFullYear(), 11, 31);
        label = 'Este año';
        break;

      default:
        return;
    }

    this.emitDateRange({
      from: this.formatDate(from),
      to: this.formatDate(to),
      label
    });
    this.closePicker();
  }

  applyCustomRange(): void {
    if (this.customFrom && this.customTo) {
      this.emitDateRange({
        from: this.customFrom,
        to: this.customTo,
        label: 'Personalizado'
      });
      this.closePicker();
    }
  }

  clearRange(): void {
    this.customFrom = '';
    this.customTo = '';
    this.dateRangeChange.emit({ from: '', to: '', label: '' });
  }

  private emitDateRange(range: DateRange): void {
    this.dateRangeChange.emit(range);
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  get displayLabel(): string {
    if (!this.from || !this.to) {
      return this.label;
    }

    const fromDate = new Date(this.from);
    const toDate = new Date(this.to);
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };

    return `${fromDate.toLocaleDateString('es-AR', options)} - ${toDate.toLocaleDateString('es-AR', options)}`;
  }
}
