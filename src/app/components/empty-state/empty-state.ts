import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-empty-state',
  templateUrl: './empty-state.html',
  styleUrls: ['./empty-state.css'],
  standalone: true,
  imports: [CommonModule]
})
export class EmptyStateComponent {
  @Input() icon: string = 'inbox';
  @Input() title: string = 'No hay datos';
  @Input() description: string = '';
  @Input() actionLabel?: string;
  @Input() actionIcon?: string;
  @Output() action = new EventEmitter<void>();

  onAction(): void {
    this.action.emit();
  }
}
