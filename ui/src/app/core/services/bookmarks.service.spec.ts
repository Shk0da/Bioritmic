import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { BookmarksService } from './bookmarks.service';

describe('BookmarksService', () => {
  let service: BookmarksService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [BookmarksService]
    });
    service = TestBed.inject(BookmarksService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => expect(service).toBeTruthy());

  it('getBookmarks should GET with params', () => {
    service.getBookmarks({ page: 0, size: 10 }).subscribe();
    const req = httpMock.expectOne(r => r.url === '/api/v1/bookmarks');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('10');
    req.flush([]);
  });

  it('addBookmark should POST array', () => {
    service.addBookmark({ userId: '5' }).subscribe();
    const req = httpMock.expectOne('/api/v1/bookmarks');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual([{ userId: '5' }]);
    req.flush([]);
  });

  it('addBookmark with name should include param', () => {
    service.addBookmark({ userId: '5' }, 'TestName').subscribe();
    const req = httpMock.expectOne(r => r.url === '/api/v1/bookmarks');
    expect(req.request.params.get('name')).toBe('TestName');
    req.flush([]);
  });

  it('deleteBookmark should DELETE /{userId}', () => {
    service.deleteBookmark('5').subscribe();
    const req = httpMock.expectOne('/api/v1/bookmarks/5');
    expect(req.request.method).toBe('DELETE');
    req.flush([]);
  });
});
