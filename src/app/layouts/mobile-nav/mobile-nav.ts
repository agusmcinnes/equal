import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

interface NavItem {
  icon: string;
  label: string;
  route: string;
}

@Component({
  selector: 'app-mobile-nav',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './mobile-nav.html',
  styleUrl: './mobile-nav.css',
})
export class MobileNav {
  isDrawerOpen = false;

  // Items principales en la barra inferior
  navItems: NavItem[] = [
    { icon: 'dashboard', label: 'Inicio', route: '/dashboard' },
    { icon: 'account_balance_wallet', label: 'Transacciones', route: '/transactions' },
    { icon: 'flag', label: 'Objetivos', route: '/goals' },
  ];

  // Todas las opciones en el drawer
  allMenuItems: NavItem[] = [
    { icon: 'dashboard', label: 'Dashboard', route: '/dashboard' },
    { icon: 'account_balance_wallet', label: 'Transacciones', route: '/transactions' },
    { icon: 'category', label: 'Categorías', route: '/categories' },
    { icon: 'schedule', label: 'Operaciones Futuras', route: '/scheduled' },
    { icon: 'savings', label: 'Ahorros', route: '/savings' },
    { icon: 'trending_up', label: 'Inversiones', route: '/investments' },
    { icon: 'flag', label: 'Objetivos', route: '/goals' },
    { icon: 'attach_money', label: 'Dólar', route: '/dollar' },
    { icon: 'settings', label: 'Configuración', route: '/settings' },
    { icon: 'account_circle', label: 'Perfil', route: '/profile' },
  ];

  toggleDrawer() {
    this.isDrawerOpen = !this.isDrawerOpen;
  }

  closeDrawer() {
    this.isDrawerOpen = false;
  }
}
