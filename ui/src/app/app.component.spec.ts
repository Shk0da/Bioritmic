import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AppComponent } from './app.component';
import { GeolocationService } from './core/services/geolocation.service';
import { AuthService } from './core/services/auth.service';
import { PushNotificationService } from './core/services/push-notification.service';

describe('AppComponent', () => {
  let geolocationSpy: jasmine.SpyObj<GeolocationService>;

  beforeEach(async () => {
    const geoSpy = jasmine.createSpyObj('GeolocationService', ['startTracking', 'stopTracking']);
    const aSpy = jasmine.createSpyObj('AuthService', [], {
      currentUser$: of({ id: 'user-1' }),
    });

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        { provide: GeolocationService, useValue: geoSpy },
        { provide: AuthService, useValue: aSpy },
        { provide: PushNotificationService, useValue: {} },
      ]
    }).compileComponents();

    geolocationSpy = TestBed.inject(GeolocationService) as jasmine.SpyObj<GeolocationService>;
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should have title "Bioritmic"', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('Bioritmic');
  });

  it('should stop tracking on destroy', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    fixture.destroy();
    expect(geolocationSpy.stopTracking).toHaveBeenCalled();
  });
});
