import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MailboxService, normalizeMediaMimeType } from './mailbox.service';

describe('MailboxService', () => {
  let service: MailboxService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [MailboxService]
    });
    service = TestBed.inject(MailboxService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => expect(service).toBeTruthy());

  it('getMailbox should GET with params', () => {
    service.getMailbox({ page: 0, size: 20 }).subscribe();
    const req = httpMock.expectOne(r => r.url === '/api/v1/mailbox');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('20');
    req.flush([]);
  });

  it('sendMail should POST', () => {
    service.sendMail({ to: '2', message: 'hi' }).subscribe();
    const req = httpMock.expectOne('/api/v1/mailbox');
    expect(req.request.method).toBe('POST');
    req.flush({ messages: [], hasMore: false });
  });

  it('sendMail with name should include param', () => {
    service.sendMail({ to: '2', message: 'hi' }, 'TestName').subscribe();
    const req = httpMock.expectOne(r => r.url === '/api/v1/mailbox');
    expect(req.request.params.get('name')).toBe('TestName');
    req.flush({ messages: [], hasMore: false });
  });

  it('sendMediaMail should POST multipart to /media', () => {
    const file = new Blob(['test'], { type: 'image/png' });
    service.sendMediaMail('user-2', 'PHOTO', file, 'photo.png', 'caption').subscribe();
    const req = httpMock.expectOne('/api/v1/mailbox/media');
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBeTrue();
    req.flush({ messages: [], hasMore: false });
  });

  it('sendMediaMail should strip codec suffix from video MIME type', () => {
    const blob = new Blob(['video'], { type: 'video/webm;codecs=vp9,opus' });
    service.sendMediaMail('user-2', 'VIDEO_NOTE', blob, 'video.webm').subscribe();
    const req = httpMock.expectOne('/api/v1/mailbox/media');
    const body = req.request.body as FormData;
    const uploaded = body.get('file') as File;
    expect(uploaded.type).toBe('video/webm');
    req.flush({ messages: [], hasMore: false });
  });

  it('normalizeMediaMimeType should simplify codec parameters', () => {
    expect(normalizeMediaMimeType('video/webm;codecs=vp9,opus', 'VIDEO_NOTE')).toBe('video/webm');
    expect(normalizeMediaMimeType('audio/webm;codecs=opus', 'VOICE')).toBe('audio/webm');
  });

  it('deleteMail should DELETE /{userId}', () => {
    service.deleteMail('2').subscribe();
    const req = httpMock.expectOne('/api/v1/mailbox/2');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('deleteMessages should DELETE /messages with ids body', () => {
    service.deleteMessages([1, 2]).subscribe();
    const req = httpMock.expectOne('/api/v1/mailbox/messages');
    expect(req.request.method).toBe('DELETE');
    expect(req.request.body).toEqual({ ids: [1, 2] });
    req.flush({ deleted: 2 });
  });

  it('getConversation should GET /conversation/{userId}', () => {
    service.getConversation('2').subscribe();
    const req = httpMock.expectOne(r => r.url === '/api/v1/mailbox/conversation/2');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('size')).toBe('30');
    req.flush({ messages: [], hasMore: false });
  });

  it('getConversation with before cursor should pass query param', () => {
    service.getConversation('2', { before: 42, size: 30 }).subscribe();
    const req = httpMock.expectOne(r => r.url === '/api/v1/mailbox/conversation/2');
    expect(req.request.params.get('before')).toBe('42');
    expect(req.request.params.get('size')).toBe('30');
    req.flush({ messages: [], hasMore: false });
  });
});
