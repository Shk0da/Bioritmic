import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GeolocationService } from './core/services/geolocation.service';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet></router-outlet>'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Bioritmic';

  constructor(
    private geolocationService: GeolocationService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Подписываемся на изменения авторизации и запускаем/останавливаем отслеживание
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.geolocationService.startTracking();
      } else {
        this.geolocationService.stopTracking();
      }
    });
  }

  ngOnDestroy(): void {
    this.geolocationService.stopTracking();
  }
}
