import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MeetingsService } from './meetings.service';

describe('MeetingsService', () => {
  let service: MeetingsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [MeetingsService]
    });
    service = TestBed.inject(MeetingsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => expect(service).toBeTruthy());

  it('getMeetings should GET with params', () => {
    service.getMeetings({ page: 0, size: 10 }).subscribe();
    const req = httpMock.expectOne(r => r.url === '/api/v1/meetings');
    expect(req.request.params.get('page')).toBe('0');
    req.flush([]);
  });

  it('createMeeting should POST array', () => {
    service.createMeeting({
      userId: '2',
      lat: 55,
      lon: 37,
      distance: 10,
      description: 'Кафе',
      scheduledAt: new Date(Date.now() + 86400000).toISOString()
    }).subscribe();
    const req = httpMock.expectOne('/api/v1/meetings');
    expect(req.request.method).toBe('POST');
    expect(Array.isArray(req.request.body)).toBeTrue();
    req.flush([]);
  });

  it('getMeetingLimit should GET /limit', () => {
    service.getMeetingLimit().subscribe((response) => {
      expect(response.totalCount).toBe(2);
      expect(response.totalLimit).toBe(20);
      expect(response.dailyCount).toBe(1);
      expect(response.dailyLimit).toBe(5);
    });
    const req = httpMock.expectOne('/api/v1/meetings/limit');
    expect(req.request.method).toBe('GET');
    req.flush({ totalCount: 2, totalLimit: 20, dailyCount: 1, dailyLimit: 5 });
  });

  it('deleteMeeting should DELETE /{userId}', () => {
    service.deleteMeeting('2').subscribe();
    const req = httpMock.expectOne('/api/v1/meetings/2');
    expect(req.request.method).toBe('DELETE');
    req.flush([]);
  });

  it('declineMeeting should PUT /{userId}/decline', () => {
    service.declineMeeting('2').subscribe();
    const req = httpMock.expectOne('/api/v1/meetings/2/decline');
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });

  it('acceptMeeting should PUT /{userId}/accept', () => {
    service.acceptMeeting('2').subscribe();
    const req = httpMock.expectOne('/api/v1/meetings/2/accept');
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });

  it('hasSentMeeting should GET /{userId}/sent', () => {
    service.hasSentMeeting('2').subscribe();
    const req = httpMock.expectOne('/api/v1/meetings/2/sent');
    expect(req.request.method).toBe('GET');
    req.flush({ sent: true });
  });

  it('getBadgeCount should GET /badge with since param', () => {
    service.getBadgeCount(12345).subscribe();
    const req = httpMock.expectOne(r => r.url === '/api/v1/meetings/badge');
    expect(req.request.params.get('since')).toBe('12345');
    req.flush({ count: 2 });
  });
});
