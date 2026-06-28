import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PushNotificationService } from './push-notification.service';

describe('PushNotificationService', () => {
  let service: PushNotificationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PushNotificationService, provideHttpClient(), provideHttpClientTesting()]
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
});
