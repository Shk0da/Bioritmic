import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { BoostService } from './boost.service';

describe('BoostService', () => {
  let service: BoostService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [BoostService]
    });
    service = TestBed.inject(BoostService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => expect(service).toBeTruthy());

  it('activateBoost should POST /api/v1/boost/activate', () => {
    service.activateBoost().subscribe(r => expect(r.success).toBeTrue());
    const req = httpMock.expectOne('/api/v1/boost/activate');
    expect(req.request.method).toBe('POST');
    req.flush({ success: true, expiresAt: 999 });
  });

  it('getCurrentBoost should GET /api/v1/boost/current', () => {
    service.getCurrentBoost().subscribe();
    const req = httpMock.expectOne('/api/v1/boost/current');
    expect(req.request.method).toBe('GET');
    req.flush(null);
  });

  it('activateBoost should return success and expiresAt', () => {
    const mockResponse = { success: true, expiresAt: 1700000000000 };
    service.activateBoost().subscribe(r => {
      expect(r.success).toBeTrue();
      expect(r.expiresAt).toBe(1700000000000);
    });
    const req = httpMock.expectOne('/api/v1/boost/activate');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(mockResponse);
  });

  it('getCurrentBoost should return boost info when active', () => {
    const mockBoost = { startedAt: 1700000000000, expiresAt: 1700086400000 };
    service.getCurrentBoost().subscribe(boost => {
      expect(boost).toBeTruthy();
      expect(boost?.startedAt).toBe(1700000000000);
      expect(boost?.expiresAt).toBe(1700086400000);
    });
    const req = httpMock.expectOne('/api/v1/boost/current');
    req.flush(mockBoost);
  });

  it('getCurrentBoost should return null when no active boost', () => {
    service.getCurrentBoost().subscribe(boost => {
      expect(boost).toBeNull();
    });
    const req = httpMock.expectOne('/api/v1/boost/current');
    req.flush(null);
  });
});
