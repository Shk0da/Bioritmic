import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SearchService } from './search.service';

describe('SearchService', () => {
  let service: SearchService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SearchService]
    });
    service = TestBed.inject(SearchService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => expect(service).toBeTruthy());

  it('search should GET /api/v1/search', () => {
    service.search().subscribe();
    const req = httpMock.expectOne('/api/v1/search');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('searchByFilter should POST', () => {
    service.searchByFilter({ gender: 'MAN' as any, ageMin: 18 }).subscribe();
    const req = httpMock.expectOne('/api/v1/search');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ gender: 'MAN', ageMin: 18 });
    req.flush([]);
  });

  it('searchByFilter with name should include param', () => {
    service.searchByFilter({ ageMin: 18 }, 'TestName').subscribe();
    const req = httpMock.expectOne(r => r.url === '/api/v1/search');
    expect(req.request.params.get('name')).toBe('TestName');
    req.flush([]);
  });
});
