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
  navItems: NavItem[] = [
    { icon: 'dashboard', label: 'Inicio', route: '/dashboard' },
    { icon: 'account_balance_wallet', label: 'Transacciones', route: '/transactions' },
    { icon: 'flag', label: 'Objetivos', route: '/goals' },
    { icon: 'account_circle', label: 'Perfil', route: '/profile' },
  ];
}
