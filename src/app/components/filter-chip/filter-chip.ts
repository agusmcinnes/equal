import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-filter-chip',
  templateUrl: './filter-chip.html',
  styleUrls: ['./filter-chip.css'],
  standalone: true,
  imports: [CommonModule]
})
export class FilterChipComponent {
  @Input() label: string = '';
  @Input() value: string | number = '';
  @Input() removable: boolean = true;
  @Input() active: boolean = false;
  @Output() remove = new EventEmitter<void>();
  @Output() chipClick = new EventEmitter<void>();

  onRemove(event: Event): void {
    event.stopPropagation();
    this.remove.emit();
  }

  onClick(): void {
    this.chipClick.emit();
  }
}
