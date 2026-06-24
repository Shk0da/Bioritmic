import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  let service: AdminService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AdminService]
    });
    service = TestBed.inject(AdminService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => expect(service).toBeTruthy());

  it('getDashboard should GET /api/v1/admin/dashboard', () => {
    service.getDashboard().subscribe(d => expect(d.totalUsers).toBe(10));
    const req = httpMock.expectOne('/api/v1/admin/dashboard');
    req.flush({ totalUsers: 10, verifiedUsers: 8, unverifiedUsers: 2, pendingReports: 0 });
  });

  it('getUsers should GET /api/v1/admin/users', () => {
    service.getUsers().subscribe(u => expect(u.length).toBe(2));
    const req = httpMock.expectOne('/api/v1/admin/users');
    req.flush([{ id: 1 }, { id: 2 }]);
  });

  it('banUser should POST', () => {
    service.banUser(5).subscribe();
    const req = httpMock.expectOne('/api/v1/admin/users/5/ban');
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('unbanUser should POST', () => {
    service.unbanUser(5).subscribe();
    const req = httpMock.expectOne('/api/v1/admin/users/5/unban');
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('deleteUser should DELETE', () => {
    service.deleteUser(5).subscribe();
    const req = httpMock.expectOne('/api/v1/admin/users/5');
    expect(req.request.method).toBe('DELETE');
    req.flush({});
  });

  it('getPendingReports should GET /api/v1/admin/reports', () => {
    service.getPendingReports().subscribe(r => expect(r.length).toBe(1));
    const req = httpMock.expectOne('/api/v1/admin/reports');
    req.flush([{ id: 1, reason: 'spam' }]);
  });

  it('resolveReport should POST', () => {
    service.resolveReport(1).subscribe();
    const req = httpMock.expectOne('/api/v1/admin/reports/1/resolve');
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('getMetrics should GET /api/v1/admin/metrics', () => {
    service.getMetrics().subscribe(m => expect(m.jvm.version).toBe('21'));
    const req = httpMock.expectOne('/api/v1/admin/metrics');
    req.flush({ jvm: { version: '21' }, database: {}, system: {} });
  });
});
