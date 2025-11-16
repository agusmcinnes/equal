import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScheduledTransactionWithDetails } from '../../models/scheduled-transaction.model';
import { ScheduledTransactionsService } from '../../services/scheduled-transactions.service';

@Component({
  selector: 'app-scheduled-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './scheduled-card.html',
  styleUrl: './scheduled-card.css'
})
export class ScheduledCardComponent {
  @Input() transaction!: ScheduledTransactionWithDetails;
  @Output() edit = new EventEmitter<ScheduledTransactionWithDetails>();
  @Output() delete = new EventEmitter<string>();
  @Output() toggle = new EventEmitter<{ id: string; isActive: boolean }>();

  constructor(private scheduledTransactionsService: ScheduledTransactionsService) {}

  onEdit(): void {
    this.edit.emit(this.transaction);
  }

  onDelete(): void {
    if (confirm('¿Estás seguro de que deseas eliminar esta transacción programada?')) {
      this.delete.emit(this.transaction.id!);
    }
  }

  onToggle(): void {
    this.toggle.emit({
      id: this.transaction.id!,
      isActive: !this.transaction.is_active
    });
  }

  getFrequencyLabel(): string {
    return this.scheduledTransactionsService.getFrequencyLabel(this.transaction.frequency);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  isExpired(): boolean {
    if (!this.transaction.end_date) return false;
    return new Date(this.transaction.end_date) < new Date();
  }

  daysUntilExecution(): number {
    const now = new Date();
    const next = new Date(this.transaction.next_execution_date);
    const diffTime = next.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
}
