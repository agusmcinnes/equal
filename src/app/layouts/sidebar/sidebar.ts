import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

interface MenuItem {
  icon: string;
  label: string;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  menuItems: MenuItem[] = [
    { icon: 'dashboard', label: 'Dashboard', route: '/dashboard' },
    { icon: 'account_balance_wallet', label: 'Transacciones', route: '/transactions' },
    { icon: 'category', label: 'Categorías', route: '/categories' },
    { icon: 'schedule', label: 'Operaciones Futuras', route: '/scheduled' },
    { icon: 'savings', label: 'Ahorros', route: '/savings' },
    { icon: 'trending_up', label: 'Inversiones', route: '/investments' },
    { icon: 'flag', label: 'Objetivos', route: '/goals' },
    { icon: 'attach_money', label: 'Dólar', route: '/dollar' },
    { icon: 'settings', label: 'Configuración', route: '/settings' },
  ];

  isCollapsed = false;

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
  }
}
