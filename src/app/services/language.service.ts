import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';

export type Language = 'es' | 'en' | 'pt';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private currentLanguageSubject: BehaviorSubject<Language>;
  public currentLanguage: Observable<Language>;
  private translations: { [key: string]: any } = {};
  private readonly LANGUAGE_KEY = 'selectedLanguage';
  private readonly DEFAULT_LANGUAGE: Language = 'es';

  constructor(private http: HttpClient) {
    const savedLanguage = (localStorage.getItem(this.LANGUAGE_KEY) as Language) || this.DEFAULT_LANGUAGE;
    this.currentLanguageSubject = new BehaviorSubject<Language>(savedLanguage);
    this.currentLanguage = this.currentLanguageSubject.asObservable();
    
    // Load default language
    this.loadLanguage(savedLanguage);
  }

  private loadLanguage(language: Language): void {
    this.http.get(`/assets/i18n/${language}.json`).subscribe({
      next: (translations: any) => {
        this.translations[language] = translations;
      },
      error: (err) => {
        console.error(`Failed to load language ${language}:`, err);
      }
    });
  }

  setLanguage(language: Language): void {
    this.currentLanguageSubject.next(language);
    localStorage.setItem(this.LANGUAGE_KEY, language);
    
    // Load language if not already loaded
    if (!this.translations[language]) {
      this.loadLanguage(language);
    }
    
    document.documentElement.lang = language;
  }

  getLanguage(): Language {
    return this.currentLanguageSubject.value;
  }

  translate(key: string, params?: any): Observable<string> {
    return new Observable(observer => {
      const language = this.getLanguage();
      let value = this.getNestedProperty(this.translations[language] || {}, key);
      
      if (!value) {
        value = key;
      }
      
      // Simple parameter replacement
      if (params) {
        Object.keys(params).forEach(param => {
          value = value.replace(`{{${param}}}`, params[param]);
        });
      }
      
      observer.next(value);
      observer.complete();
    });
  }

  instant(key: string, params?: any): string {
    const language = this.getLanguage();
    let value = this.getNestedProperty(this.translations[language] || {}, key);
    
    if (!value) {
      value = key;
    }
    
    // Simple parameter replacement
    if (params) {
      Object.keys(params).forEach(param => {
        value = value.replace(`{{${param}}}`, params[param]);
      });
    }
    
    return value;
  }

  private getNestedProperty(obj: any, path: string): any {
    const keys = path.split('.');
    let value = obj;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return null;
      }
    }
    
    return value;
  }
}
