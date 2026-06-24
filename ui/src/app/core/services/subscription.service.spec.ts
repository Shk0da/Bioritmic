import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SubscriptionService } from './subscription.service';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SubscriptionService]
    });
    service = TestBed.inject(SubscriptionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => expect(service).toBeTruthy());

  it('getCurrentSubscription should GET /api/v1/subscription/current', () => {
    service.getCurrentSubscription().subscribe();
    const req = httpMock.expectOne('/api/v1/subscription/current');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('verifyReceipt should POST', () => {
    service.verifyReceipt('token123').subscribe();
    const req = httpMock.expectOne('/api/v1/subscription/verify');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ receiptToken: 'token123' });
    req.flush({});
  });

  it('cancelSubscription should POST', () => {
    service.cancelSubscription().subscribe();
    const req = httpMock.expectOne('/api/v1/subscription/cancel');
    expect(req.request.method).toBe('POST');
    req.flush({});
  });
});
