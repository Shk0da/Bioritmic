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
});
