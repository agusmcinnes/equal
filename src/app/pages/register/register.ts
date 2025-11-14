import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  email = '';
  password = '';
  confirmPassword = '';
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async onSubmit() {
    if (!this.email || !this.password || !this.confirmPassword) {
      this.errorMessage = 'Por favor complete todos los campos';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden';
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'La contraseña debe tener al menos 6 caracteres';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const { data, error } = await this.authService.signUp(this.email, this.password);

    this.loading = false;

    if (error) {
      this.errorMessage = 'Error al crear la cuenta. El email ya puede estar registrado.';
    } else {
      this.successMessage = 'Cuenta creada exitosamente. Revisa tu email para confirmar.';
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 2000);
    }
  }
}
