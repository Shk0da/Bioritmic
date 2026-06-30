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
});
