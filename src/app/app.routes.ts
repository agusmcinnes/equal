import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { Dashboard } from './pages/dashboard/dashboard';
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
        loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.Dashboard)
      },
      {
        path: 'categories',
        loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.Dashboard)
      },
      {
        path: 'scheduled',
        loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.Dashboard)
      },
      {
        path: 'savings',
        loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.Dashboard)
      },
      {
        path: 'investments',
        loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.Dashboard)
      },
      {
        path: 'goals',
        loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.Dashboard)
      },
      {
        path: 'dollar',
        loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.Dashboard)
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.Dashboard)
      },
      {
        path: 'profile',
        loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.Dashboard)
      }
    ]
  },

  // Wildcard route
  {
    path: '**',
    redirectTo: 'login'
  }
];
