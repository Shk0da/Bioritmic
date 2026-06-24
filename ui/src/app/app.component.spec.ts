import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { GeolocationService } from './core/services/geolocation.service';
import { AuthService } from './core/services/auth.service';

describe('AppComponent', () => {
  let geolocationSpy: jasmine.SpyObj<GeolocationService>;
  let authSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    const geoSpy = jasmine.createSpyObj('GeolocationService', ['startTracking', 'stopTracking']);
    const aSpy = jasmine.createSpyObj('AuthService', [], { currentUser$: { subscribe: () => {} } });

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        { provide: GeolocationService, useValue: geoSpy },
        { provide: AuthService, useValue: aSpy }
      ]
    }).compileComponents();

    geolocationSpy = TestBed.inject(GeolocationService) as jasmine.SpyObj<GeolocationService>;
    authSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
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
