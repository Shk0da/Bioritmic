import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  let service: SettingsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SettingsService]
    });
    service = TestBed.inject(SettingsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => expect(service).toBeTruthy());

  describe('getSettings', () => {
    it('should GET /api/v1/user/settings', () => {
      service.getSettings().subscribe(s => {
        expect(s.ageMin).toBe(20);
      });
      const req = httpMock.expectOne('/api/v1/user/settings');
      expect(req.request.method).toBe('GET');
      req.flush({ ageMin: 20, ageMax: 40 });
    });

    it('should return defaults on error', () => {
      service.getSettings().subscribe(s => {
        expect(s.ageMin).toBe(18);
        expect(s.ageMax).toBe(45);
        expect(s.distance).toBe(50);
      });
      const req = httpMock.expectOne('/api/v1/user/settings');
      req.flush('Not found', { status: 404, statusText: 'Not Found' });
    });
  });

  describe('updateSettings', () => {
    it('should POST settings', () => {
      service.updateSettings({ ageMin: 20, ageMax: 40 }).subscribe();
      const req = httpMock.expectOne('/api/v1/user/settings');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ ageMin: 20, ageMax: 40 });
      req.flush({});
    });

    it('should include name param when provided', () => {
      service.updateSettings({ ageMin: 20 }, 'TestName').subscribe();
      const req = httpMock.expectOne(r => r.url === '/api/v1/user/settings');
      expect(req.request.params.get('name')).toBe('TestName');
      req.flush({});
    });
  });
});
