import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ModalStateService } from '../../shared/modal-state.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

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
export class MobileNav implements OnInit, OnDestroy {
  isDrawerOpen = false;
  showLogoutConfirm = false;
  isModalOpen = false;

  private destroy$ = new Subject<void>();

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
    { icon: 'flag', label: 'Objetivos', route: '/goals' },
    { icon: 'attach_money', label: 'Dólar', route: '/dollar' },
    { icon: 'savings', label: 'Plazo fijo', route: '/plazo-fijo' },
  ];

  constructor(
    private authService: AuthService,
    private modalStateService: ModalStateService
  ) {}

  ngOnInit(): void {
    this.modalStateService.isModalOpen$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isOpen => {
        this.isModalOpen = isOpen;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleDrawer() {
    this.isDrawerOpen = !this.isDrawerOpen;
  }

  closeDrawer() {
    this.isDrawerOpen = false;
    this.showLogoutConfirm = false;
  }

  toggleLogoutConfirm() {
    this.showLogoutConfirm = !this.showLogoutConfirm;
  }

  confirmLogout() {
    this.showLogoutConfirm = false;
    this.authService.signOut();
    this.closeDrawer();
  }

  cancelLogout() {
    this.showLogoutConfirm = false;
  }
}
