import { PushNotificationService } from './push-notification.service';

describe('PushNotificationService', () => {
  let service: PushNotificationService;

  beforeEach(() => {
    service = new PushNotificationService(null as any);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getCurrentToken', () => {
    it('should return null initially', () => {
      expect(service.getCurrentToken()).toBeNull();
    });
  });

  describe('messages$', () => {
    it('should be an observable', () => {
      expect(service.messages$).toBeTruthy();
    });
  });
});
