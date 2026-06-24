import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MailboxService } from './mailbox.service';

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
    service.sendMail({ to: 2, message: 'hi' }).subscribe();
    const req = httpMock.expectOne('/api/v1/mailbox');
    expect(req.request.method).toBe('POST');
    req.flush([]);
  });

  it('sendMail with name should include param', () => {
    service.sendMail({ to: 2, message: 'hi' }, 'TestName').subscribe();
    const req = httpMock.expectOne(r => r.url === '/api/v1/mailbox');
    expect(req.request.params.get('name')).toBe('TestName');
    req.flush([]);
  });

  it('deleteMail should DELETE /{userId}', () => {
    service.deleteMail(2).subscribe();
    const req = httpMock.expectOne('/api/v1/mailbox/2');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('getConversation should GET /conversation/{userId}', () => {
    service.getConversation(2).subscribe();
    const req = httpMock.expectOne('/api/v1/mailbox/conversation/2');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
