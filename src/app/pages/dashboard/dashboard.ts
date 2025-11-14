import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  stats = [
    {
      title: 'Balance Total',
      value: '$0.00',
      icon: 'account_balance_wallet',
      color: 'primary'
    },
    {
      title: 'Ingresos del Mes',
      value: '$0.00',
      icon: 'trending_up',
      color: 'success'
    },
    {
      title: 'Gastos del Mes',
      value: '$0.00',
      icon: 'trending_down',
      color: 'danger'
    },
    {
      title: 'Ahorros',
      value: '$0.00',
      icon: 'savings',
      color: 'accent'
    }
  ];

  recentTransactions = [
    // Se llenarán con datos reales de Supabase
  ];

  goals = [
    // Se llenarán con objetivos del usuario
  ];
}
