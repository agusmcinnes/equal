import { Component, Input, Output, EventEmitter, OnInit, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-datetime-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './datetime-picker.html',
  styleUrl: './datetime-picker.css'
})
export class DatetimePickerComponent implements OnInit {
  @Input() value: string = '';
  @Input() placeholder: string = 'Seleccionar fecha';
  @Input() required: boolean = false;
  @Input() showTime: boolean = true;
  @Input() disabled: boolean = false;
  @Output() valueChange = new EventEmitter<string>();

  isOpen = false;
  currentMonth: Date = new Date();
  selectedDate: Date | null = null;
  selectedHour: number = 12;
  selectedMinute: number = 0;

  days: (number | null)[] = [];
  weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  constructor(private elementRef: ElementRef) {}

  ngOnInit() {
    if (this.value) {
      const date = new Date(this.value);
      if (!isNaN(date.getTime())) {
        this.selectedDate = date;
        this.currentMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        this.selectedHour = date.getHours();
        this.selectedMinute = date.getMinutes();
      }
    }
    this.generateCalendar();
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }

  togglePicker() {
    if (!this.disabled) {
      this.isOpen = !this.isOpen;
      if (this.isOpen) {
        this.generateCalendar();
      }
    }
  }

  closePicker() {
    this.isOpen = false;
  }

  generateCalendar() {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    this.days = [];

    // Empty slots before first day
    for (let i = 0; i < firstDay; i++) {
      this.days.push(null);
    }

    // Days of month
    for (let i = 1; i <= daysInMonth; i++) {
      this.days.push(i);
    }
  }

  prevMonth() {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() - 1,
      1
    );
    this.generateCalendar();
  }

  nextMonth() {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() + 1,
      1
    );
    this.generateCalendar();
  }

  selectDay(day: number | null) {
    if (day === null) return;

    this.selectedDate = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth(),
      day,
      this.selectedHour,
      this.selectedMinute
    );

    if (!this.showTime) {
      this.confirmSelection();
    }
  }

  isSelected(day: number | null): boolean {
    if (!day || !this.selectedDate) return false;
    return (
      this.selectedDate.getDate() === day &&
      this.selectedDate.getMonth() === this.currentMonth.getMonth() &&
      this.selectedDate.getFullYear() === this.currentMonth.getFullYear()
    );
  }

  isToday(day: number | null): boolean {
    if (!day) return false;
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === this.currentMonth.getMonth() &&
      today.getFullYear() === this.currentMonth.getFullYear()
    );
  }

  incrementHour() {
    this.selectedHour = (this.selectedHour + 1) % 24;
    this.updateSelectedDateTime();
  }

  decrementHour() {
    this.selectedHour = (this.selectedHour - 1 + 24) % 24;
    this.updateSelectedDateTime();
  }

  incrementMinute() {
    this.selectedMinute = (this.selectedMinute + 1) % 60;
    this.updateSelectedDateTime();
  }

  decrementMinute() {
    this.selectedMinute = (this.selectedMinute - 1 + 60) % 60;
    this.updateSelectedDateTime();
  }

  private updateSelectedDateTime() {
    if (this.selectedDate) {
      this.selectedDate = new Date(
        this.selectedDate.getFullYear(),
        this.selectedDate.getMonth(),
        this.selectedDate.getDate(),
        this.selectedHour,
        this.selectedMinute
      );
    }
  }

  confirmSelection() {
    if (this.selectedDate) {
      const isoString = this.showTime
        ? this.selectedDate.toISOString()
        : this.selectedDate.toISOString().split('T')[0];
      this.value = isoString;
      this.valueChange.emit(isoString);
    }
    this.isOpen = false;
  }

  clearSelection() {
    this.selectedDate = null;
    this.value = '';
    this.valueChange.emit('');
    this.isOpen = false;
  }

  get displayValue(): string {
    if (!this.selectedDate) return '';

    const day = this.selectedDate.getDate().toString().padStart(2, '0');
    const month = (this.selectedDate.getMonth() + 1).toString().padStart(2, '0');
    const year = this.selectedDate.getFullYear();

    if (this.showTime) {
      const hour = this.selectedDate.getHours().toString().padStart(2, '0');
      const minute = this.selectedDate.getMinutes().toString().padStart(2, '0');
      return `${day}/${month}/${year} ${hour}:${minute}`;
    }

    return `${day}/${month}/${year}`;
  }

  formatHour(hour: number): string {
    return hour.toString().padStart(2, '0');
  }

  formatMinute(minute: number): string {
    return minute.toString().padStart(2, '0');
  }
}
