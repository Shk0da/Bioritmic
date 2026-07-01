import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { StoriesBarComponent } from './stories-bar.component';
import { StoryService, Story } from '../../../core/services/story.service';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { ModalService } from '../../../core/services/modal.service';
import { ToastService } from '../../../core/services/toast.service';

describe('StoriesBarComponent', () => {
  let fixture: import('@angular/core/testing').ComponentFixture<StoriesBarComponent>;
  let component: StoriesBarComponent;
  let storyService: jasmine.SpyObj<StoryService>;
  let userService: jasmine.SpyObj<UserService>;
  let authService: jasmine.SpyObj<AuthService>;
  let modalService: jasmine.SpyObj<ModalService>;
  let toastService: jasmine.SpyObj<ToastService>;

  const ownStory: Story = {
    id: 10,
    userId: 'u1',
    mediaUrl: '/my-story.jpg',
    expiresAt: Date.now() + 3600000,
    createdAt: Date.now(),
    locked: false,
    viewerCount: 0,
    viewedByCurrentUser: false
  };

  beforeEach(async () => {
    storyService = jasmine.createSpyObj('StoryService', ['getFeed', 'deleteStory']);
    storyService.getFeed.and.returnValue(of<Story[]>([
      ownStory,
      {
        id: 1,
        userId: 'u2',
        mediaUrl: '/m1',
        expiresAt: Date.now() + 3600000,
        createdAt: Date.now(),
        locked: false,
        viewerCount: 0,
        viewedByCurrentUser: false
      }
    ]));
    storyService.deleteStory.and.returnValue(of({ success: true }));

    userService = jasmine.createSpyObj('UserService', ['getUserById', 'getCachedPhotoUrl', 'peekCachedPhotoUrl']);
    userService.getUserById.and.returnValue(of({ id: 'u2', name: 'Alice' }));
    userService.peekCachedPhotoUrl.and.returnValue(null);
    userService.getCachedPhotoUrl.and.returnValue(of(null));

    authService = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    authService.getCurrentUser.and.returnValue({ id: 'u1', name: 'Me', email: 'me@test.com', isVerified: true });

    modalService = jasmine.createSpyObj('ModalService', ['alert', 'confirm']);
    modalService.alert.and.returnValue(Promise.resolve());
    modalService.confirm.and.returnValue(Promise.resolve(true));

    toastService = jasmine.createSpyObj('ToastService', ['success', 'error']);

    await TestBed.configureTestingModule({
      imports: [StoriesBarComponent],
      providers: [
        { provide: StoryService, useValue: storyService },
        { provide: UserService, useValue: userService },
        { provide: AuthService, useValue: authService },
        { provide: ModalService, useValue: modalService },
        { provide: ToastService, useValue: toastService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StoriesBarComponent);
    component = fixture.componentInstance;
  });

  it('should load stories feed on init', () => {
    fixture.detectChanges();
    expect(storyService.getFeed).toHaveBeenCalled();
    expect(component.storyGroups.length).toBe(1);
    expect(component.storyGroups[0].userId).toBe('u2');
    expect(component.myStories.length).toBe(1);
  });

  it('should open story creator for verified user', () => {
    fixture.detectChanges();
    component.openCreator();
    expect(component.creatorVisible).toBeTrue();
    expect(modalService.alert).not.toHaveBeenCalled();
  });

  it('should block story creator for unverified user', async () => {
    authService.getCurrentUser.and.returnValue({ id: 'u1', name: 'Me', email: 'me@test.com', isVerified: false });
    fixture.detectChanges();
    await component.openCreator();
    expect(component.creatorVisible).toBeFalse();
    expect(modalService.alert).toHaveBeenCalled();
  });

  it('should open story viewer with selected group', () => {
    fixture.detectChanges();
    const group = component.storyGroups[0];
    component.openViewer(group);
    expect(component.viewerVisible).toBeTrue();
    expect(component.viewerIsOwnStories).toBeFalse();
    expect(component.viewerStories).toEqual(group.stories);
  });

  it('should open own story viewer when my stories exist', () => {
    fixture.detectChanges();
    component.openMyStory();
    expect(component.viewerVisible).toBeTrue();
    expect(component.viewerIsOwnStories).toBeTrue();
    expect(component.viewerStories).toEqual(component.myStories);
  });

  it('should delete own stories after confirmation', async () => {
    fixture.detectChanges();
    const event = new Event('click');
    spyOn(event, 'stopPropagation');

    await component.deleteMyStories(event);

    expect(event.stopPropagation).toHaveBeenCalled();
    expect(modalService.confirm).toHaveBeenCalled();
    expect(storyService.deleteStory).toHaveBeenCalledWith(10);
    expect(toastService.success).toHaveBeenCalled();
  });

  it('should not render lock button on story bar card', () => {
    fixture.detectChanges();
    const lockBtn = fixture.nativeElement.querySelector('[data-testid="story-lock-btn"]');
    expect(lockBtn).toBeNull();
  });

  it('should reload stories after creation', () => {
    fixture.detectChanges();
    storyService.getFeed.calls.reset();
    component.onStoryCreated();
    expect(storyService.getFeed).toHaveBeenCalled();
    expect(component.creatorVisible).toBeFalse();
  });

  it('should detect next unviewed story group', () => {
    fixture.detectChanges();
    component.storyGroups.push({
      userId: 'u3',
      stories: [{
        id: 3,
        userId: 'u3',
        mediaUrl: '/m3',
        expiresAt: Date.now() + 3600000,
        createdAt: Date.now(),
        locked: false,
        viewerCount: 0,
        viewedByCurrentUser: false
      }],
      viewedByCurrentUser: false,
      userName: 'Bob',
      userPhoto: null,
      statusEmoji: null,
      statusPosition: null
    });
    component.viewerUserId = 'u2';
    component.viewerVisible = true;
    component.viewerIsOwnStories = false;

    expect(component.viewerHasNextUser()).toBeTrue();
  });

  it('should open next unviewed story group after current user finishes', () => {
    fixture.detectChanges();
    component.storyGroups.push({
      userId: 'u3',
      stories: [{
        id: 3,
        userId: 'u3',
        mediaUrl: '/m3',
        expiresAt: Date.now() + 3600000,
        createdAt: Date.now(),
        locked: false,
        viewerCount: 0,
        viewedByCurrentUser: false
      }],
      viewedByCurrentUser: false,
      userName: 'Bob',
      userPhoto: null,
      statusEmoji: null,
      statusPosition: null
    });
    component.viewerUserId = 'u2';
    component.viewerUserName = 'Alice';
    component.viewerStories = component.storyGroups[0].stories;
    component.viewerVisible = true;
    component.viewerIsOwnStories = false;
    component.storyGroups[0].stories.forEach((story) => {
      story.viewedByCurrentUser = true;
    });

    component.openNextUnviewedGroup();

    expect(component.viewerUserId).toBe('u3');
    expect(component.viewerUserName).toBe('Bob');
    expect(component.viewerVisible).toBeTrue();
    expect(component.storyGroups[0].viewedByCurrentUser).toBeTrue();
  });
});
