import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { StoryViewerComponent } from './story-viewer.component';
import { Story, StoryService } from '../../../core/services/story.service';
import { ToastService } from '../../../core/services/toast.service';

describe('StoryViewerComponent', () => {
  let fixture: import('@angular/core/testing').ComponentFixture<StoryViewerComponent>;
  let component: StoryViewerComponent;
  let storyService: jasmine.SpyObj<StoryService>;
  let toastService: jasmine.SpyObj<ToastService>;

  const ownStories: Story[] = [
    {
      id: 10,
      userId: 'u1',
      mediaUrl: '/story-1.jpg',
      expiresAt: Date.now() + 3600000,
      createdAt: Date.now(),
      locked: false,
      viewerCount: 2,
      viewedByCurrentUser: false
    },
    {
      id: 11,
      userId: 'u1',
      mediaUrl: '/story-2.jpg',
      expiresAt: Date.now() + 3600000,
      createdAt: Date.now() - 1000,
      locked: true,
      viewerCount: 1,
      viewedByCurrentUser: false
    }
  ];

  beforeEach(async () => {
    storyService = jasmine.createSpyObj('StoryService', ['viewStory', 'reactToStory', 'setStoryLocked']);
    storyService.viewStory.and.returnValue(of({ success: true }));
    storyService.setStoryLocked.and.callFake((id: number, locked: boolean) => of({
      id,
      locked,
      expiresAt: Date.now() + 3600000
    }));

    toastService = jasmine.createSpyObj('ToastService', ['error']);

    await TestBed.configureTestingModule({
      imports: [StoryViewerComponent],
      providers: [
        provideRouter([]),
        { provide: StoryService, useValue: storyService },
        { provide: ToastService, useValue: toastService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StoryViewerComponent);
    component = fixture.componentInstance;
    component.visible = true;
    component.isOwnStories = true;
    component.stories = ownStories.map((story) => ({ ...story }));
    component.userId = 'u1';
    component.userName = 'Me';
  });

  it('should show lock button only for own stories', () => {
    component.isOwnStories = false;
    component.ngOnChanges({
      visible: { currentValue: true, previousValue: false, firstChange: false, isFirstChange: () => false }
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="story-lock-btn"]')).toBeNull();
  });

  it('should render lock button for current own story', () => {
    component.ngOnChanges({
      visible: { currentValue: true, previousValue: false, firstChange: false, isFirstChange: () => false }
    });
    fixture.detectChanges();

    const lockBtn = fixture.nativeElement.querySelector('[data-testid="story-lock-btn"]');
    expect(lockBtn).toBeTruthy();
    expect(lockBtn.classList.contains('locked')).toBeFalse();
  });

  it('should lock currently viewed story', () => {
    component.ngOnChanges({
      visible: { currentValue: true, previousValue: false, firstChange: false, isFirstChange: () => false }
    });

    component.toggleCurrentStoryLock(new Event('click'));

    expect(storyService.setStoryLocked).toHaveBeenCalledWith(10, true);
    expect(component.currentStory?.locked).toBeTrue();
    expect(component.stories[0].locked).toBeTrue();
    expect(component.stories[1].locked).toBeTrue();
  });

  it('should lock the story that is currently open after navigation', () => {
    component.ngOnChanges({
      visible: { currentValue: true, previousValue: false, firstChange: false, isFirstChange: () => false }
    });
    component.showStory(1);
    fixture.detectChanges();

    const lockBtn = fixture.nativeElement.querySelector('[data-testid="story-lock-btn"]');
    expect(lockBtn.classList.contains('locked')).toBeTrue();

    component.toggleCurrentStoryLock(new Event('click'));

    expect(storyService.setStoryLocked).toHaveBeenCalledWith(11, false);
    expect(component.currentStory?.locked).toBeFalse();
    expect(component.stories[0].locked).toBeFalse();
    expect(component.stories[1].locked).toBeFalse();
  });

  it('should show error toast when lock toggle fails', () => {
    storyService.setStoryLocked.and.returnValue(throwError(() => new Error('network')));
    component.ngOnChanges({
      visible: { currentValue: true, previousValue: false, firstChange: false, isFirstChange: () => false }
    });

    component.toggleCurrentStoryLock(new Event('click'));

    expect(toastService.error).toHaveBeenCalledWith('Не удалось изменить замок истории');
    expect(component.togglingStoryLock).toBeFalse();
  });
});
