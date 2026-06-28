import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { StoriesBarComponent } from './stories-bar.component';
import { StoryService, Story } from '../../../core/services/story.service';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { ModalService } from '../../../core/services/modal.service';

describe('StoriesBarComponent', () => {
  let fixture: ComponentFixture<StoriesBarComponent>;
  let component: StoriesBarComponent;
  let storyService: jasmine.SpyObj<StoryService>;
  let userService: jasmine.SpyObj<UserService>;
  let authService: jasmine.SpyObj<AuthService>;
  let modalService: jasmine.SpyObj<ModalService>;

  beforeEach(async () => {
    storyService = jasmine.createSpyObj('StoryService', ['getFeed']);
    storyService.getFeed.and.returnValue(of<Story[]>([
      {
        id: 1,
        userId: 'u2',
        mediaUrl: '/m1',
        expiresAt: Date.now() + 3600000,
        createdAt: Date.now(),
        viewerCount: 0,
        viewedByCurrentUser: false
      }
    ]));

    userService = jasmine.createSpyObj('UserService', ['getUserById', 'getUserPhotos', 'resolveProfilePhotoUrl']);
    userService.getUserById.and.returnValue(of({ id: 'u2', name: 'Alice' }));
    userService.getUserPhotos.and.returnValue(of([]));
    userService.resolveProfilePhotoUrl.and.returnValue(of(null));

    authService = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    authService.getCurrentUser.and.returnValue({ id: 'u1', name: 'Me', email: 'me@test.com', isVerified: true });

    modalService = jasmine.createSpyObj('ModalService', ['alert']);
    modalService.alert.and.returnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      imports: [StoriesBarComponent],
      providers: [
        { provide: StoryService, useValue: storyService },
        { provide: UserService, useValue: userService },
        { provide: AuthService, useValue: authService },
        { provide: ModalService, useValue: modalService }
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
    expect(component.viewerStories).toBe(group.stories);
  });

  it('should reload stories after creation', () => {
    fixture.detectChanges();
    storyService.getFeed.calls.reset();
    component.onStoryCreated();
    expect(storyService.getFeed).toHaveBeenCalled();
    expect(component.creatorVisible).toBeFalse();
  });
});
