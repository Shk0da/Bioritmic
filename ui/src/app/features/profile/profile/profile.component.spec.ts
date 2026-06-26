import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { ProfileComponent } from './profile.component';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { BoostService } from '../../../core/services/boost.service';
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

    userService = jasmine.createSpyObj('UserService', ['getCurrentUser', 'getBlockedUsers', 'getPhoto']);
    userService.getCurrentUser.and.returnValue(of(mockUser));
    userService.getBlockedUsers.and.returnValue(of([]));
    userService.getPhoto.and.returnValue(throwError(() => new Error('no photo')));

    boostService = jasmine.createSpyObj('BoostService', ['activateBoost', 'getCurrentBoost']);
    boostService.getCurrentBoost.and.returnValue(of(null));

    await TestBed.configureTestingModule({
      imports: [ProfileComponent, RouterTestingModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
        { provide: UserService, useValue: userService },
        { provide: BoostService, useValue: boostService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
