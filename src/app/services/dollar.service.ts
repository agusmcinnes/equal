import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval, of } from 'rxjs';
import { switchMap, catchError, map, startWith } from 'rxjs/operators';

export interface DollarRate {
  currency: string;
  buy: number;
  sell: number;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class DollarService {
  private apiUrl = 'https://api.bluelytics.com.ar/v2/latest';
  
  constructor(private http: HttpClient) {}

  /**
   * Get current dollar rates
   * Using Bluelytics API (Argentina live dollar rates)
   */
  getDollarRates(): Observable<DollarRate[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map(response => {
        const rates: DollarRate[] = [];
        const timestamp = new Date(response.last_update);
        
        // Official dollar rate
        if (response.oficial) {
          rates.push({
            currency: 'Oficial',
            buy: response.oficial.value_buy,
            sell: response.oficial.value_sell,
            timestamp: timestamp
          });
        }

        // Blue dollar rate (informal market)
        if (response.blue) {
          rates.push({
            currency: 'Blue',
            buy: response.blue.value_buy,
            sell: response.blue.value_sell,
            timestamp: timestamp
          });
        }

        return rates;
      }),
      catchError(error => {
        console.error('Error fetching dollar rates:', error);
        // Return mock data if API fails
        return of([
          {
            currency: 'Oficial',
            buy: 0,
            sell: 0,
            timestamp: new Date()
          },
          {
            currency: 'Blue',
            buy: 0,
            sell: 0,
            timestamp: new Date()
          }
        ]);
      })
    );
  }

  /**
   * Get dollar rates with auto-refresh every 30 seconds
   */
  getDollarRatesAutoRefresh(): Observable<DollarRate[]> {
    return interval(30000).pipe(
      startWith(0),
      switchMap(() => this.getDollarRates())
    );
  }

  /**
   * Get dollar rate by currency type
   */
  getDollarRate(currencyType: 'oficial' | 'blue' | 'ccl'): Observable<DollarRate | null> {
    return this.getDollarRates().pipe(
      map(rates => {
        const label = currencyType.charAt(0).toUpperCase() + currencyType.slice(1);
        return rates.find(r => r.currency === label) || null;
      }),
      catchError(() => of(null))
    );
  }
}
