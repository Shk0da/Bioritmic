import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  public toasts$ = this.toastsSubject.asObservable();
  private counter = 0;

  private addToast(message: string, type: Toast['type'], duration: number): void {
    const id = ++this.counter;
    const toast: Toast = { id, message, type, duration };
    this.toastsSubject.next([...this.toastsSubject.value, toast]);

    if (duration > 0) {
      setTimeout(() => this.remove(id), duration);
    }
  }

  success(message: string, duration = 3000): void {
    this.addToast(message, 'success', duration);
  }

  error(message: string, duration = 5000): void {
    this.addToast(message, 'error', duration);
  }

  info(message: string, duration = 3000): void {
    this.addToast(message, 'info', duration);
  }

  warning(message: string, duration = 4000): void {
    this.addToast(message, 'warning', duration);
  }

  remove(id: number): void {
    this.toastsSubject.next(this.toastsSubject.value.filter(t => t.id !== id));
  }

  clear(): void {
    this.toastsSubject.next([]);
  }
}
