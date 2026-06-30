import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { PushNotificationService } from './push-notification.service';
import { AuthService } from './auth.service';

describe('PushNotificationService', () => {
  let service: PushNotificationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        register: jasmine.createSpy('register').and.resolveTo({
          active: { state: 'activated' },
          installing: null,
          waiting: null,
        }),
        ready: Promise.resolve({
          active: { state: 'activated' },
        }),
        addEventListener: jasmine.createSpy('addEventListener'),
      },
    });
    TestBed.configureTestingModule({
      providers: [
        PushNotificationService,
        { provide: AuthService, useValue: { isAuthenticated: () => true } },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    service = TestBed.inject(PushNotificationService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return null token initially', () => {
    expect(service.getCurrentToken()).toBeNull();
  });

  it('should expose messages$ observable', () => {
    expect(service.messages$).toBeTruthy();
  });

  it('should persist enabled state', () => {
    service.setEnabled(true);
    expect(service.isEnabled()).toBeTrue();
    service.setEnabled(false);
    expect(service.isEnabled()).toBeFalse();
  });

  it('should clear enabled state when browser permission is not granted', () => {
    service.setEnabled(true);
    spyOnProperty(Notification, 'permission', 'get').and.returnValue('denied');
    service.syncEnabledWithPermission();
    expect(service.isEnabled()).toBeFalse();
  });

  it('should remove push token via DELETE without body', async () => {
    service.setEnabled(true);
    const disablePromise = service.disable();

    const req = httpMock.expectOne('/api/v1/user/me/push-token');
    expect(req.request.method).toBe('DELETE');
    expect(req.request.body).toBeNull();
    req.flush({ success: true });

    await disablePromise;
    expect(service.isEnabled()).toBeFalse();
  });

  it('should resolve mailbox conversation url from push data', () => {
    expect(PushNotificationService.resolveNotificationUrl({
      type: 'mailbox',
      userId: 'abc-123',
    })).toBe('/mailbox/abc-123');
    expect(PushNotificationService.resolveNotificationUrl({ type: 'mailbox' })).toBe('/mailbox');
    expect(PushNotificationService.resolveNotificationUrl({ type: 'meeting' })).toBe('/meetings');
    expect(PushNotificationService.resolveNotificationUrl({ type: 'meeting', url: '/meetings' })).toBe('/meetings');
    expect(PushNotificationService.resolveNotificationUrl({ url: '/meetings' })).toBe('/meetings');
    expect(PushNotificationService.resolveNotificationUrl({ url: '//evil.com' })).toBe('/');
  });

  it('ensureRegistered should fetch client config before choosing push mode', async () => {
    service.setEnabled(true);
    spyOnProperty(Notification, 'permission', 'get').and.returnValue('granted');

    const resultPromise = service.ensureRegistered();
    const req = httpMock.expectOne('/api/v1/config/client');
    expect(req.request.method).toBe('GET');
    req.flush({
      firebase: {
        enabled: false,
        apiKey: '',
        authDomain: '',
        projectId: '',
        storageBucket: '',
        messagingSenderId: '',
        appId: '',
        vapidKey: '',
      },
    });

    const result = await resultPromise;
    expect(result.enabled).toBeTrue();
    expect(result.mode).toBe('local');
  });
});
