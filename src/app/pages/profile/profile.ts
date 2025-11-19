import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { User } from '../../models/user.model';
import { UserProfile } from '../../models/user.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-profile',
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class Profile implements OnInit, OnDestroy {
  currentUser: User | null = null;
  userProfile: UserProfile | null = null;
  isEditing = false;
  isLoading = true;
  isSaving = false;
  errorMessage = '';
  successMessage = '';

  editForm = {
    full_name: '',
    bio: ''
  };

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private profileService: ProfileService
  ) {
    // Mostrar "Cargando" por defecto
    this.isLoading = true;
  }

  ngOnInit() {
    this.authService.currentUser
      .pipe(takeUntil(this.destroy$))
      .subscribe(async (user) => {
        if (user) {
          this.currentUser = user;
          this.isLoading = true;
          this.errorMessage = '';
          
          try {
            const profile = await this.profileService.loadProfile(user.id);
            if (profile) {
              this.userProfile = profile;
              this.editForm = {
                full_name: profile.full_name || '',
                bio: profile.bio || ''
              };
            } else {
              this.errorMessage = 'No se pudo cargar el perfil';
            }
          } catch (error) {
            console.error('Error loading profile:', error);
            this.errorMessage = 'Error cargando el perfil';
          } finally {
            this.isLoading = false;
          }
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  startEditing() {
    this.isEditing = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  cancelEditing() {
    this.isEditing = false;
    if (this.userProfile) {
      this.editForm = {
        full_name: this.userProfile.full_name || '',
        bio: this.userProfile.bio || ''
      };
    }
  }

  async saveProfile() {
    if (!this.currentUser) return;

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const updated = await this.profileService.updateProfile(this.currentUser.id, {
        full_name: this.editForm.full_name,
        bio: this.editForm.bio
      });

      if (updated) {
        this.userProfile = updated;
        this.successMessage = 'Perfil actualizado correctamente';
        this.isEditing = false;
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      } else {
        this.errorMessage = 'Error al actualizar el perfil';
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      this.errorMessage = 'Error al guardar los cambios';
    } finally {
      this.isSaving = false;
    }
  }

  async onAvatarSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file || !this.currentUser) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      this.errorMessage = 'La imagen no debe superar 5MB';
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.errorMessage = 'Por favor selecciona una imagen válida';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';

    try {
      const avatarUrl = await this.profileService.uploadAvatar(this.currentUser.id, file);
      if (avatarUrl && this.userProfile) {
        this.userProfile.avatar_url = avatarUrl;
        this.successMessage = 'Avatar actualizado correctamente';
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      this.errorMessage = 'Error al subir la imagen';
    } finally {
      this.isSaving = false;
    }
  }

  triggerAvatarUpload() {
    document.getElementById('avatarInput')?.click();
  }

  async createEmptyProfile() {
    if (!this.currentUser) return;

    this.isSaving = true;
    this.errorMessage = '';

    try {
      const profile = await this.profileService.createProfile(this.currentUser.id);
      if (profile) {
        this.userProfile = profile;
        this.editForm = {
          full_name: profile.full_name || '',
          bio: profile.bio || ''
        };
        this.successMessage = 'Perfil creado correctamente';
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      } else {
        this.errorMessage = 'Error al crear el perfil';
      }
    } catch (error) {
      console.error('Error creating profile:', error);
      this.errorMessage = 'Error al crear el perfil';
    } finally {
      this.isSaving = false;
    }
  }

  formatDate(date: string | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}
