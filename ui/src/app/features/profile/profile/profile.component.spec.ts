import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { ProfileComponent } from './profile.component';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { BoostService } from '../../../core/services/boost.service';
import { ShareService } from '../../../core/services/share.service';
import { ModalService } from '../../../core/services/modal.service';
import { ToastService } from '../../../core/services/toast.service';
import { UserInfo, Gender } from '../../../core/models/user.model';

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let userService: jasmine.SpyObj<UserService>;
  let boostService: jasmine.SpyObj<BoostService>;

  const mockUser: UserInfo = {
    id: '1',
    name: 'Test User',
    email: 'test@test.com',
    gender: Gender.MAN,
    birthday: '1990-01-01',
    role: 'USER',
    isPro: true
  };

  beforeEach(async () => {
    authService = jasmine.createSpyObj('AuthService', ['getCurrentUser', 'isAuthenticated', 'clearAuth']);
    Object.defineProperty(authService, 'currentUser$', { get: () => of(mockUser) });
    authService.getCurrentUser.and.returnValue(mockUser);

    userService = jasmine.createSpyObj('UserService', ['getCurrentUser', 'getBlockedCount', 'resolveProfilePhotoUrl', 'updateUser']);
    userService.getCurrentUser.and.returnValue(of(mockUser));
    userService.getBlockedCount.and.returnValue(of({ count: 0 }));
    userService.resolveProfilePhotoUrl.and.returnValue(of(null));
    userService.updateUser.and.returnValue(of(mockUser));

    boostService = jasmine.createSpyObj('BoostService', ['activateBoost', 'getCurrentBoost']);
    boostService.getCurrentBoost.and.returnValue(of(null));

    const shareService = jasmine.createSpyObj('ShareService', ['shareProfile']);
    shareService.shareProfile.and.returnValue(Promise.resolve('copied'));

    const modalService = jasmine.createSpyObj('ModalService', ['alert']);
    modalService.alert.and.returnValue(Promise.resolve());

    const toastService = jasmine.createSpyObj('ToastService', ['error', 'success']);

    await TestBed.configureTestingModule({
      imports: [ProfileComponent, RouterTestingModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
        { provide: UserService, useValue: userService },
        { provide: BoostService, useValue: boostService },
        { provide: ShareService, useValue: shareService },
        { provide: ModalService, useValue: modalService },
        { provide: ToastService, useValue: toastService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
  });

  it('should save status immediately when emoji is selected', () => {
    fixture.detectChanges();
    component.statusPanelOpen = true;
    component.selectStatusEmoji('🔥');
    expect(userService.updateUser).toHaveBeenCalledWith({
      statusEmoji: '🔥',
      statusPosition: 'BOTTOM_RIGHT'
    });
  });

  it('should share profile using nick when it is set', async () => {
    const shareService = TestBed.inject(ShareService) as jasmine.SpyObj<ShareService>;
    fixture.detectChanges();
    component.user = { ...mockUser, nick: 'alex_42' };

    await component.shareProfile();

    expect(shareService.shareProfile).toHaveBeenCalledWith('alex_42', 'Test User');
  });

  it('should share profile using id when nick is not set', async () => {
    const shareService = TestBed.inject(ShareService) as jasmine.SpyObj<ShareService>;
    fixture.detectChanges();
    component.user = { ...mockUser };

    await component.shareProfile();

    expect(shareService.shareProfile).toHaveBeenCalledWith('1', 'Test User');
  });
});
