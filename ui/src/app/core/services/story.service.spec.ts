import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { StoryService } from './story.service';

describe('StoryService', () => {
  let service: StoryService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [StoryService]
    });
    service = TestBed.inject(StoryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => expect(service).toBeTruthy());

  it('getFeed should GET /api/v1/stories', () => {
    service.getFeed().subscribe();
    const req = httpMock.expectOne('/api/v1/stories');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('createStory should POST multipart form', () => {
    const file = new File(['image'], 'story.jpg', { type: 'image/jpeg' });
    service.createStory(file, 'caption').subscribe();
    const req = httpMock.expectOne('/api/v1/stories');
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBeTrue();
    req.flush({ id: 1 });
  });

  it('viewStory should POST /{id}/view', () => {
    service.viewStory(5).subscribe();
    const req = httpMock.expectOne('/api/v1/stories/5/view');
    expect(req.request.method).toBe('POST');
    req.flush({ success: true });
  });

  it('reactToStory should POST /{id}/react', () => {
    service.reactToStory(5, 'FIRE').subscribe();
    const req = httpMock.expectOne('/api/v1/stories/5/react');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ reaction: 'FIRE' });
    req.flush({ reaction: 'FIRE', reactionCounts: { FIRE: 1 } });
  });
});
