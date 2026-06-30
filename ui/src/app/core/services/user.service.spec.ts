import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { UserService } from './user.service';
import { AuthService } from './auth.service';
import { GisData, UserSettings } from '../models/user.model';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    authService = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    authService.getCurrentUser.and.returnValue(null);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        UserService,
        { provide: AuthService, useValue: authService },
      ]
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

  it('getBlockedCount should GET /api/v1/user/blocked/count', () => {
    service.getBlockedCount().subscribe(r => expect(r.count).toBe(2));
    const req = httpMock.expectOne('/api/v1/user/blocked/count');
    expect(req.request.method).toBe('GET');
    req.flush({ count: 2 });
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
    let result: GisData | null | undefined;
    service.getGisData().subscribe((data) => { result = data; });
    const req = httpMock.expectOne('/api/v1/user/me/gis');
    expect(req.request.method).toBe('GET');
    req.flush({ lat: 55.0, lon: 37.0 });
    expect(result?.lat).toBe(55.0);
  });

  it('getGisData should return null when location is not set', () => {
    let result: GisData | null | undefined;
    service.getGisData().subscribe((data) => { result = data; });
    const req = httpMock.expectOne('/api/v1/user/me/gis');
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(result).toBeNull();
  });

  it('deleteGisData should DELETE /api/v1/user/me/gis', () => {
    service.deleteGisData().subscribe();
    const req = httpMock.expectOne('/api/v1/user/me/gis');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
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

  it('getPhoto with card size should request size=card query param', () => {
    service.getPhoto('42', 'card').subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/api/v1/user/42/photo') && r.params.get('size') === 'card');
    expect(req.request.method).toBe('GET');
    req.flush(new ArrayBuffer(8));
  });

  it('getPhoto with full size should request size=full query param', () => {
    service.getPhoto('42', 'full').subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/api/v1/user/42/photo') && r.params.get('size') === 'full');
    expect(req.request.method).toBe('GET');
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

  it('resolveProfilePhotoUrl should return photo url when photos exist', () => {
    let result: string | null | undefined;
    service.resolveProfilePhotoUrl('42', 123).subscribe((url) => { result = url; });
    const req = httpMock.expectOne('/api/v1/user/42/photos');
    req.flush([{ photoOrder: 0 }]);
    expect(result).toBe('/api/v1/user/42/photo?v=123&size=card');
  });

  it('resolveProfilePhotoUrl should return null when photos are missing', () => {
    let result: string | null | undefined;
    service.resolveProfilePhotoUrl('42').subscribe((url) => { result = url; });
    const req = httpMock.expectOne('/api/v1/user/42/photos');
    req.flush([]);
    expect(result).toBeNull();
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

  it('getUserSettings should return defaults on 404', () => {
    let result: UserSettings | undefined;
    service.getUserSettings().subscribe(settings => { result = settings; });
    const req = httpMock.expectOne('/api/v1/user/settings');
    req.flush({ errors: [{ message: 'Settings for User not found.' }] }, { status: 404, statusText: 'Not Found' });
    expect(result).toEqual({ ageMin: 18, ageMax: 45, distance: 30 });
  });

  it('saveUserSettings should POST /api/v1/user/settings', () => {
    service.saveUserSettings({ ageMin: 20 }).subscribe();
    const req = httpMock.expectOne('/api/v1/user/settings');
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('getBiorhythmDetail should GET /api/v1/biorhythm/{id}/detail', () => {
    service.getBiorhythmDetail('42').subscribe();
    const req = httpMock.expectOne('/api/v1/biorhythm/42/detail');
    expect(req.request.method).toBe('GET');
    req.flush({ physical: 0.8 });
  });

  it('getCachedPhotoUrl should return cached url without a second HTTP request', () => {
    let firstUrl: string | null | undefined;
    let secondUrl: string | null | undefined;

    service.getCachedPhotoUrl('42', 'card').subscribe((url) => { firstUrl = url; });
    const req = httpMock.expectOne((r) => r.url.includes('/api/v1/user/42/photo') && r.params.get('size') === 'card');
    req.flush(new ArrayBuffer(16));

    service.getCachedPhotoUrl('42', 'card').subscribe((url) => { secondUrl = url; });

    expect(firstUrl).toBeTruthy();
    expect(secondUrl).toBe(firstUrl);
    httpMock.expectNone((r) => r.url.includes('/api/v1/user/42/photo'));
  });

  it('peekCachedPhotoUrl should return url after cache is populated', () => {
    service.getCachedPhotoUrl('42', 'card').subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/api/v1/user/42/photo'));
    req.flush(new ArrayBuffer(16));

    expect(service.peekCachedPhotoUrl('42', 'card')).toBeTruthy();
  });

  it('getCachedPhotoUrl should not cache failed photo requests', () => {
    service.getCachedPhotoUrl('42', 'card').subscribe();
    httpMock.expectOne((r) => r.url.includes('/api/v1/user/42/photo')).flush(null, { status: 404, statusText: 'Not Found' });

    expect(service.peekCachedPhotoUrl('42', 'card')).toBeNull();

    service.getCachedPhotoUrl('42', 'card').subscribe();
    httpMock.expectOne((r) => r.url.includes('/api/v1/user/42/photo')).flush(new ArrayBuffer(16));
  });

  it('invalidatePhotoCache should force a new HTTP request', () => {
    service.getCachedPhotoUrl('42', 'card').subscribe();
    httpMock.expectOne((r) => r.url.includes('/api/v1/user/42/photo')).flush(new ArrayBuffer(16));

    service.invalidatePhotoCache('42');
    service.getCachedPhotoUrl('42', 'card').subscribe();
    httpMock.expectOne((r) => r.url.includes('/api/v1/user/42/photo')).flush(new ArrayBuffer(16));
  });

  it('releasePhotoUrl should not revoke blob urls still held in the shared cache', () => {
    let cachedUrl: string | null | undefined;
    service.getCachedPhotoUrl('42', 'card').subscribe((url) => { cachedUrl = url; });
    httpMock.expectOne((r) => r.url.includes('/api/v1/user/42/photo')).flush(new ArrayBuffer(16));

    spyOn(URL, 'revokeObjectURL');
    service.releasePhotoUrl(cachedUrl);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();

    const standaloneUrl = UserService.createPhotoUrl(new Uint8Array([1, 2, 3]));
    service.releasePhotoUrl(standaloneUrl);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(standaloneUrl);
    UserService.revokePhotoUrl(standaloneUrl);
  });

  it('uploadPhoto should invalidate only current user photo cache', () => {
    authService.getCurrentUser.and.returnValue({ id: 'me', name: 'Me', email: 'me@test.com' });

    service.getCachedPhotoUrl('42', 'card').subscribe();
    httpMock.expectOne((r) => r.url.includes('/api/v1/user/42/photo')).flush(new ArrayBuffer(16));
    expect(service.peekCachedPhotoUrl('42', 'card')).toBeTruthy();

    service.getCachedPhotoUrl('me', 'card').subscribe();
    httpMock.expectOne((r) => r.url.includes('/api/v1/user/me/photo')).flush(new ArrayBuffer(16));
    expect(service.peekCachedPhotoUrl('me', 'card')).toBeTruthy();

    const file = new File([''], 'test.png', { type: 'image/png' });
    service.uploadPhoto(file).subscribe();
    const uploadReq = httpMock.expectOne('/api/v1/user/me/photo');
    uploadReq.flush(null);

    expect(service.peekCachedPhotoUrl('me', 'card')).toBeNull();
    expect(service.peekCachedPhotoUrl('42', 'card')).toBeTruthy();
  });
});
