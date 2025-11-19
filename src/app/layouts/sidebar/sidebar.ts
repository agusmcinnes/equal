import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarStateService } from '../../shared/sidebar-state.service';
import { AuthService } from '../../services/auth.service';

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
    { icon: 'wallet', label: 'Billeteras', route: '/wallets' },
    { icon: 'category', label: 'Categorías', route: '/categories' },
    { icon: 'schedule', label: 'Operaciones Futuras', route: '/scheduled' },
    { icon: 'flag', label: 'Objetivos', route: '/goals' },
    { icon: 'attach_money', label: 'Dólar', route: '/dollar' },
    { icon: 'settings', label: 'Configuración', route: '/settings' },
  ];

  showLogoutConfirm = false;

  constructor(
    public sidebarState: SidebarStateService,
    private authService: AuthService
  ) {}

  get isCollapsed(): boolean {
    return this.sidebarState.isCollapsed;
  }

  toggleSidebar() {
    this.sidebarState.toggle();
  }

  toggleLogoutConfirm() {
    this.showLogoutConfirm = !this.showLogoutConfirm;
  }

  confirmLogout() {
    this.showLogoutConfirm = false;
    this.authService.signOut();
  }

  cancelLogout() {
    this.showLogoutConfirm = false;
  }
}
