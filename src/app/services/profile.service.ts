import { Injectable } from '@angular/core';
import { SupabaseService } from '../core/supabase.service';
import { UserProfile } from '../models/user.model';
import { Observable, BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private profileSubject = new BehaviorSubject<UserProfile | null>(null);
  public profile$ = this.profileSubject.asObservable();

  constructor(private supabase: SupabaseService) {}

  async loadProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // Si el perfil no existe, crear uno automáticamente
        if (error.code === 'PGRST116') {
          console.log('Profile does not exist, creating one...');
          return await this.createProfile(userId);
        }
        throw error;
      }

      this.profileSubject.next(data as UserProfile);
      return data as UserProfile;
    } catch (error) {
      console.error('Error loading profile:', error);
      return null;
    }
  }

  async createProfile(userId: string, fullName?: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .insert([{ user_id: userId, full_name: fullName || '' }])
        .select()
        .single();

      if (error) throw error;

      this.profileSubject.next(data as UserProfile);
      return data as UserProfile;
    } catch (error) {
      console.error('Error creating profile:', error);
      return null;
    }
  }

  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      this.profileSubject.next(data as UserProfile);
      return data as UserProfile;
    } catch (error) {
      console.error('Error updating profile:', error);
      return null;
    }
  }

  async uploadAvatar(userId: string, file: File): Promise<string | null> {
    try {
      // Create a path with userId as folder: userId/avatar-timestamp.ext
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const fileName = `${userId}/avatar-${Date.now()}.${fileExtension}`;
      
      const { data, error: uploadError } = await this.supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: publicUrlData } = this.supabase.storage
        .from('avatars')
        .getPublicUrl(data.path);

      const avatarUrl = publicUrlData.publicUrl;

      // Update profile with new avatar URL
      await this.updateProfile(userId, { avatar_url: avatarUrl });

      return avatarUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      return null;
    }
  }

  getProfile(): UserProfile | null {
    return this.profileSubject.value;
  }
}
