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
    req.flush({ totalUsers: 10, verifiedUsers: 8, unverifiedUsers: 2, pendingReports: 0, newFeedback: 0 });
  });

  it('getUsers should GET /api/v1/admin/users', () => {
    service.getUsers().subscribe(u => {
      expect(u.users.length).toBe(2);
      expect(u.total).toBe(2);
    });
    const req = httpMock.expectOne('/api/v1/admin/users?page=0&size=50');
    req.flush({ users: [{ id: '1' }, { id: '2' }], total: 2, page: 0, size: 50 });
  });

  it('getUsers should GET /api/v1/admin/users with search', () => {
    service.getUsers(0, 50, '9794c247').subscribe(u => expect(u.users.length).toBe(1));
    const req = httpMock.expectOne('/api/v1/admin/users?page=0&size=50&search=9794c247');
    req.flush({ users: [{ id: '9794c247-6d72-4769-ab1a-a23939f15ede' }], total: 1, page: 0, size: 50 });
  });

  it('banUser should POST', () => {
    service.banUser('5').subscribe();
    const req = httpMock.expectOne('/api/v1/admin/users/5/ban');
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('unbanUser should POST', () => {
    service.unbanUser('5').subscribe();
    const req = httpMock.expectOne('/api/v1/admin/users/5/unban');
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('deleteUser should DELETE', () => {
    service.deleteUser('5').subscribe();
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

  it('createReport should POST /api/v1/report', () => {
    service.createReport('42', 'SPAM', 'Test description').subscribe(r => {
      expect(r.id).toBe(1);
      expect(r.status).toBe('PENDING');
    });
    const req = httpMock.expectOne('/api/v1/report');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      reported_user_id: '42',
      reason: 'SPAM',
      description: 'Test description'
    });
    req.flush({ id: 1, status: 'PENDING' });
  });

  it('createReport should send null description when not provided', () => {
    service.createReport('10', 'INAPPROPRIATE').subscribe();
    const req = httpMock.expectOne('/api/v1/report');
    expect(req.request.body).toEqual({
      reported_user_id: '10',
      reason: 'INAPPROPRIATE',
      description: null
    });
    req.flush({ id: 2, status: 'PENDING' });
  });

  it('verifyUser should POST', () => {
    service.verifyUser('5').subscribe();
    const req = httpMock.expectOne('/api/v1/admin/users/5/verify');
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('unverifyUser should POST', () => {
    service.unverifyUser('5').subscribe();
    const req = httpMock.expectOne('/api/v1/admin/users/5/unverify');
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('changeRole should POST with role body', () => {
    service.changeRole('5', 'MODERATOR').subscribe();
    const req = httpMock.expectOne('/api/v1/admin/users/5/role');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ role: 'MODERATOR' });
    req.flush({ success: true });
  });

  it('resetPassword should POST and return success', () => {
    service.resetPassword('5').subscribe(r => {
      expect(r.success).toBe(true);
      expect(r.userId).toBe('5');
    });
    const req = httpMock.expectOne('/api/v1/admin/users/5/reset-password');
    expect(req.request.method).toBe('POST');
    req.flush({ success: true, userId: '5' });
  });
});
