import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { UserService } from './user.service';
import { AuthService } from './auth.service';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UserService, AuthService]
    });
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => expect(service).toBeTruthy());

  it('getCurrentUser should GET /api/v1/user/me', () => {
    service.getCurrentUser().subscribe();
    const req = httpMock.expectOne('/api/v1/user/me');
    expect(req.request.method).toBe('GET');
    req.flush({ id: 1, name: 'Test' });
  });

  it('getUserById should GET /api/v1/user/{id}', () => {
    service.getUserById('42').subscribe();
    const req = httpMock.expectOne('/api/v1/user/42');
    expect(req.request.method).toBe('GET');
    req.flush({ id: '42' });
  });

  it('updateUser should PATCH /api/v1/user/me', () => {
    service.updateUser({ name: 'New' }).subscribe();
    const req = httpMock.expectOne('/api/v1/user/me');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ name: 'New' });
    req.flush({ name: 'New' });
  });

  it('deleteUser should DELETE /api/v1/user/me', () => {
    service.deleteUser().subscribe();
    const req = httpMock.expectOne('/api/v1/user/me');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('getBlockedUsers should GET with params', () => {
    service.getBlockedUsers({ page: 0, size: 10 }).subscribe();
    const req = httpMock.expectOne(r => r.url === '/api/v1/user/blocked');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('10');
    req.flush([]);
  });

  it('blockUser should PUT /api/v1/user/{id}/block', () => {
    service.blockUser('5').subscribe();
    const req = httpMock.expectOne('/api/v1/user/5/block');
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });

  it('unblockUser should PUT /api/v1/user/{id}/unblock', () => {
    service.unblockUser('5').subscribe();
    const req = httpMock.expectOne('/api/v1/user/5/unblock');
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });

  it('isBlockedBy should GET /api/v1/user/{id}/is-blocked-by', () => {
    service.isBlockedBy('5').subscribe(r => expect(r.blocked).toBeTrue());
    const req = httpMock.expectOne('/api/v1/user/5/is-blocked-by');
    expect(req.request.method).toBe('GET');
    req.flush({ blocked: true });
  });

  it('getGisData should GET /api/v1/user/me/gis', () => {
    service.getGisData().subscribe();
    const req = httpMock.expectOne('/api/v1/user/me/gis');
    expect(req.request.method).toBe('GET');
    req.flush({ lat: 55.0, lon: 37.0 });
  });

  it('saveGisData should POST /api/v1/user/me/gis', () => {
    service.saveGisData({ userId: '1', lat: 55, lon: 37 }).subscribe();
    const req = httpMock.expectOne('/api/v1/user/me/gis');
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('getPhoto with userId should GET /api/v1/user/{id}/photo', () => {
    service.getPhoto('42').subscribe();
    const req = httpMock.expectOne('/api/v1/user/42/photo');
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('arraybuffer');
    req.flush(new ArrayBuffer(8));
  });

  it('getPhoto without userId should GET /api/v1/user/me/photo', () => {
    service.getPhoto().subscribe();
    const req = httpMock.expectOne('/api/v1/user/me/photo');
    expect(req.request.method).toBe('GET');
    req.flush(new ArrayBuffer(8));
  });

  it('getUserPhotos should GET /api/v1/user/{id}/photos', () => {
    service.getUserPhotos('42').subscribe();
    const req = httpMock.expectOne('/api/v1/user/42/photos');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('uploadPhoto should POST FormData', () => {
    const file = new File([''], 'test.png', { type: 'image/png' });
    service.uploadPhoto(file).subscribe();
    const req = httpMock.expectOne('/api/v1/user/me/photo');
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBeTrue();
    req.flush(null);
  });

  it('deletePhoto should DELETE /api/v1/user/me/photo', () => {
    service.deletePhoto().subscribe();
    const req = httpMock.expectOne('/api/v1/user/me/photo');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('getUserSettings should GET /api/v1/user/settings', () => {
    service.getUserSettings().subscribe();
    const req = httpMock.expectOne('/api/v1/user/settings');
    expect(req.request.method).toBe('GET');
    req.flush({ ageMin: 18, ageMax: 45 });
  });

  it('saveUserSettings should POST /api/v1/user/settings', () => {
    service.saveUserSettings({ ageMin: 20 }).subscribe();
    const req = httpMock.expectOne('/api/v1/user/settings');
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('getAllInterests should GET /api/v1/user/interests', () => {
    service.getAllInterests().subscribe();
    const req = httpMock.expectOne('/api/v1/user/interests');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getUserInterests should GET /api/v1/user/me/interests', () => {
    service.getUserInterests().subscribe();
    const req = httpMock.expectOne('/api/v1/user/me/interests');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('setUserInterests should PUT /api/v1/user/me/interests', () => {
    service.setUserInterests([1, 2, 3]).subscribe();
    const req = httpMock.expectOne('/api/v1/user/me/interests');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual([1, 2, 3]);
    req.flush([]);
  });

  it('getRandomPrompts should GET with count in URL', () => {
    service.getRandomPrompts(5).subscribe();
    const req = httpMock.expectOne(r => r.url.includes('/api/v1/prompts/random'));
    expect(req.request.url).toContain('count=5');
    req.flush([]);
  });

  it('getBiorhythmDetail should GET /api/v1/biorhythm/{id}/detail', () => {
    service.getBiorhythmDetail('42').subscribe();
    const req = httpMock.expectOne('/api/v1/biorhythm/42/detail');
    expect(req.request.method).toBe('GET');
    req.flush({ physical: 0.8 });
  });
});
