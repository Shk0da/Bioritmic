import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { GeolocationService } from './core/services/geolocation.service';
import { AuthService } from './core/services/auth.service';
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
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    initStandalonePwaClass();
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.geolocationService.startTracking();
      } else {
        this.geolocationService.stopTracking();
      }
    });
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
    this.geolocationService.stopTracking();
  }
}
