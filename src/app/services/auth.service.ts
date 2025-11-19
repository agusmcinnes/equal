import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { SupabaseService } from '../core/supabase.service';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;
  private readonly LOCAL_STORAGE_KEY = 'currentUser';
  private initialized = false;
  private initPromise: Promise<void>;

  constructor(
    private supabase: SupabaseService,
    private router: Router
  ) {
    // Cargar inmediatamente desde localStorage para evitar flicker
    const storedUser = localStorage.getItem(this.LOCAL_STORAGE_KEY);
    let initialUser: User | null = null;
    if (storedUser) {
      try {
        initialUser = JSON.parse(storedUser);
      } catch (error) {
        localStorage.removeItem(this.LOCAL_STORAGE_KEY);
      }
    }

    this.currentUserSubject = new BehaviorSubject<User | null>(initialUser);
    this.currentUser = this.currentUserSubject.asObservable();
    this.initPromise = this.loadUser();
    this.setupAuthListener();
  }

  async waitForInit(): Promise<void> {
    await this.initPromise;
  }

  private setupAuthListener() {
    this.supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        this.currentUserSubject.next(session.user as User);
        localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(session.user));
      } else if (event === 'SIGNED_OUT') {
        this.currentUserSubject.next(null);
        localStorage.removeItem(this.LOCAL_STORAGE_KEY);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        this.currentUserSubject.next(session.user as User);
        localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(session.user));
      }
    });
  }

  private async loadUser() {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (user) {
        this.currentUserSubject.next(user as User);
        localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(user));
      } else {
        // Si Supabase no tiene sesión, limpiar localStorage
        // (la sesión expiró o fue invalidada)
        const storedUser = localStorage.getItem(this.LOCAL_STORAGE_KEY);
        if (storedUser) {
          // Mantener el usuario de localStorage solo si hay datos
          // Supabase validará en el próximo request
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      this.initialized = true;
    }
  }

  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  async signUp(email: string, password: string) {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password
      });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Error en registro:', error);
      return { data: null, error };
    }
  }

  async signIn(email: string, password: string) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      this.currentUserSubject.next(data.user as User);
      localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(data.user));
      return { data, error: null };
    } catch (error) {
      console.error('Error en login:', error);
      return { data: null, error };
    }
  }

  async signOut() {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) throw error;

      this.currentUserSubject.next(null);
      localStorage.removeItem(this.LOCAL_STORAGE_KEY);
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error en logout:', error);
    }
  }

  async resetPassword(email: string) {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error al resetear contraseña:', error);
      return { error };
    }
  }

  isAuthenticated(): boolean {
    return this.currentUserValue !== null;
  }
}
