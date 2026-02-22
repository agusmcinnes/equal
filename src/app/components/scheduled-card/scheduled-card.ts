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

  getLastExecutionDate(): string | null {
    return this.transaction.executed_last_date || this.transaction.last_execution_date || null;
  }

  isExpired(): boolean {
    if (!this.transaction.end_date) return false;
    return new Date(this.transaction.end_date) < new Date();
  }

  getStatusLabel(): string {
    if (this.isExpired()) return 'Finalizada';
    return this.transaction.is_active ? 'Activa' : 'Pausada';
  }

  getStatusClass(): string {
    if (this.isExpired()) return 'finalized';
    return this.transaction.is_active ? 'active' : 'inactive';
  }

  daysUntilExecution(): number {
    const now = new Date();
    const next = new Date(this.transaction.next_execution_date);
    const diffTime = next.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  getAccruedAmount(): number {
    if (typeof this.transaction.accrued_real === 'number') {
      return this.transaction.accrued_real;
    }
    return this.scheduledTransactionsService.getAccruedAmount(this.transaction);
  }

  getProjectedAmount(): number | null {
    return this.scheduledTransactionsService.getProjectedAmount(this.transaction);
  }

  getElapsedPeriods(): number {
    if (typeof this.transaction.executed_count === 'number') {
      return this.transaction.executed_count;
    }
    return this.scheduledTransactionsService.getElapsedOccurrences(this.transaction);
  }

  getTotalPeriods(): number | null {
    return this.scheduledTransactionsService.getTotalOccurrences(this.transaction);
  }

  getAccruedPercent(): number {
    const projected = this.getProjectedAmount();
    if (!projected || projected <= 0) return 0;
    return Math.min(100, (this.getAccruedAmount() / projected) * 100);
  }
}
