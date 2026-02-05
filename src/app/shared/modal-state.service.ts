import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ModalStateService {
  private modalOpenSubject = new BehaviorSubject<boolean>(false);
  private openModalsCount = 0;

  get isModalOpen$(): Observable<boolean> {
    return this.modalOpenSubject.asObservable();
  }

  get isModalOpen(): boolean {
    return this.modalOpenSubject.value;
  }

  openModal(): void {
    this.openModalsCount++;
    if (this.openModalsCount > 0) {
      this.modalOpenSubject.next(true);
      document.body.classList.add('modal-open');
    }
  }

  closeModal(): void {
    this.openModalsCount = Math.max(0, this.openModalsCount - 1);
    if (this.openModalsCount === 0) {
      this.modalOpenSubject.next(false);
      document.body.classList.remove('modal-open');
    }
  }
}
