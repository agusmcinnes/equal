import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type TermUnit = 'days' | 'months';

@Component({
  selector: 'app-fixed-term',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fixed-term.html',
  styleUrl: './fixed-term.css'
})
export class FixedTermComponent {
  amount = 0;
  term = 30;
  termUnit: TermUnit = 'days';
  annualRate = 0;

  get isValid(): boolean {
    return this.amount > 0 && this.term > 0 && this.annualRate > 0;
  }

  get termInDays(): number {
    return this.termUnit === 'months' ? this.term * 30 : this.term;
  }

  get projectedInterest(): number {
    if (!this.isValid) {
      return 0;
    }
    return this.amount * (this.annualRate / 100) * (this.termInDays / 365);
  }

  get projectedTotal(): number {
    if (!this.isValid) {
      return 0;
    }
    return this.amount + this.projectedInterest;
  }

  get effectiveRate(): number {
    if (!this.isValid) {
      return 0;
    }
    return (this.projectedInterest / this.amount) * 100;
  }

  reset(): void {
    this.amount = 0;
    this.term = 30;
    this.termUnit = 'days';
    this.annualRate = 0;
  }
}
