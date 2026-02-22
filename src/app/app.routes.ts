import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { Dashboard } from './pages/dashboard/dashboard';
import { Transactions } from './pages/transactions/transactions';
import { Categories } from './pages/categories/categories';
import { Goals } from './pages/goals/goals';
import { Wallets } from './pages/wallets/wallets';
import { ScheduledComponent } from './pages/scheduled/scheduled';
import { DollarComponent } from './pages/dollar/dollar';
import { FixedTermComponent } from './pages/fixed-term/fixed-term';
import { MainLayout } from './layouts/main-layout/main-layout';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  // Rutas públicas (sin layout)
  {
    path: 'login',
    component: Login
  },
  {
    path: 'register',
    component: Register
  },

  // Rutas protegidas (con layout y auth guard)
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        component: Dashboard
      },
      // Placeholder routes para las demás secciones
      {
        path: 'transactions',
        component: Transactions
      },
      {
        path: 'categories',
        component: Categories
      },
      {
        path: 'scheduled',
        component: ScheduledComponent
      },
      {
        path: 'goals',
        component: Goals
      },
      {
        path: 'wallets',
        component: Wallets
      },
      {
        path: 'dollar',
        component: DollarComponent
      },
      {
        path: 'plazo-fijo',
        component: FixedTermComponent
      }
    ]
  },

  // Wildcard route
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
