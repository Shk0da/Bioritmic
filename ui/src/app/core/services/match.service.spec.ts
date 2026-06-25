import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MatchService } from './match.service';

describe('MatchService', () => {
  let service: MatchService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [MatchService]
    });
    service = TestBed.inject(MatchService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => expect(service).toBeTruthy());

  it('getMatches should GET /api/v1/bookmarks/matches', () => {
    service.getMatches().subscribe(r => expect(r.count).toBe(2));
    const req = httpMock.expectOne('/api/v1/bookmarks/matches');
    expect(req.request.method).toBe('GET');
    req.flush({ matches: [], count: 2, blurred: false });
  });

  it('checkMatch should GET /api/v1/bookmarks/matches/{id}', () => {
    service.checkMatch('42').subscribe(r => expect(r.isMatch).toBeTrue());
    const req = httpMock.expectOne('/api/v1/bookmarks/matches/42');
    expect(req.request.method).toBe('GET');
    req.flush({ isMatch: true });
  });
});
