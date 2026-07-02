import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { GeolocationService } from './core/services/geolocation.service';
import { AuthService } from './core/services/auth.service';
import { PushNotificationService } from './core/services/push-notification.service';
import { ModalComponent } from './core/services/modal.service';
import { initStandalonePwaClass } from './shared/utils/pwa.util';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ModalComponent],
  template: `
    <router-outlet></router-outlet>
    <app-modal></app-modal>
  `
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Bioritmic';
  private userSubscription: Subscription | null = null;

  constructor(
    private geolocationService: GeolocationService,
    private authService: AuthService,
    _pushService: PushNotificationService,
  ) {}

  ngOnInit(): void {
    initStandalonePwaClass();
    this.initInteractionGuards();
    this.userSubscription = this.authService.currentUser$.pipe(
      map((user) => user?.id ?? null),
      distinctUntilChanged(),
    ).subscribe((userId) => {
      if (userId) {
        this.geolocationService.startTracking();
      } else {
        this.geolocationService.stopTracking();
      }
    });
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
    this.geolocationService.stopTracking();
    this.removeInteractionGuards();
  }

  @HostListener('document:contextmenu', ['$event'])
  onContextMenu(event: MouseEvent): void {
    event.preventDefault();
  }

  private touchStartHandler?: (event: TouchEvent) => void;
  private touchEndHandler?: () => void;
  private touchMoveHandler?: () => void;
  private touchTimer: ReturnType<typeof setTimeout> | null = null;

  private initInteractionGuards(): void {
    if (typeof document === 'undefined') {
      return;
    }
    this.touchStartHandler = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        return;
      }
      this.clearTouchTimer();
      this.touchTimer = setTimeout(() => event.preventDefault(), 500);
    };
    this.touchEndHandler = () => this.clearTouchTimer();
    this.touchMoveHandler = () => this.clearTouchTimer();
    document.addEventListener('touchstart', this.touchStartHandler, { passive: false });
    document.addEventListener('touchend', this.touchEndHandler);
    document.addEventListener('touchcancel', this.touchEndHandler);
    document.addEventListener('touchmove', this.touchMoveHandler);
  }

  private removeInteractionGuards(): void {
    if (typeof document === 'undefined') {
      return;
    }
    if (this.touchStartHandler) {
      document.removeEventListener('touchstart', this.touchStartHandler);
    }
    if (this.touchEndHandler) {
      document.removeEventListener('touchend', this.touchEndHandler);
      document.removeEventListener('touchcancel', this.touchEndHandler);
    }
    if (this.touchMoveHandler) {
      document.removeEventListener('touchmove', this.touchMoveHandler);
    }
    this.clearTouchTimer();
  }

  private clearTouchTimer(): void {
    if (this.touchTimer) {
      clearTimeout(this.touchTimer);
      this.touchTimer = null;
    }
  }
}
