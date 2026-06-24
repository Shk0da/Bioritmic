import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError, BehaviorSubject } from 'rxjs';
import { ProfileComponent } from './profile.component';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { BoostService } from '../../../core/services/boost.service';
import { UserInfo, Gender } from '../../../core/models/user.model';

describe('ProfileComponent — Admin Button', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let userService: jasmine.SpyObj<UserService>;
  let boostService: jasmine.SpyObj<BoostService>;
  let currentUserSubject: BehaviorSubject<UserInfo | null>;

  const mockAdminUser: UserInfo = {
    id: 1,
    name: 'Admin User',
    email: 'admin@test.com',
    gender: Gender.MAN,
    birthday: '1990-01-01',
    role: 'ROLE_ADMIN',
    isPro: true
  };

  const mockRegularUser: UserInfo = {
    id: 2,
    name: 'Regular User',
    email: 'user@test.com',
    gender: Gender.WOMAN,
    birthday: '1995-06-15',
    role: 'USER',
    isPro: false
  };

  const mockBannedUser: UserInfo = {
    id: 3,
    name: 'Banned User',
    email: 'banned@test.com',
    gender: Gender.MAN,
    birthday: '1988-03-10',
    role: 'BANNED',
    isPro: false
  };

  beforeEach(async () => {
    currentUserSubject = new BehaviorSubject<UserInfo | null>(mockAdminUser);

    authService = jasmine.createSpyObj('AuthService', ['getCurrentUser', 'isAuthenticated', 'clearAuth']);
    Object.defineProperty(authService, 'currentUser$', { get: () => currentUserSubject.asObservable() });
    authService.getCurrentUser.and.returnValue(mockAdminUser);

    userService = jasmine.createSpyObj('UserService', ['getCurrentUser', 'getBlockedUsers', 'getPhoto']);
    userService.getCurrentUser.and.returnValue(of(mockAdminUser));
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

  describe('isAdmin flag via currentUser$ observable', () => {
    it('should set isAdmin = true when currentUser$ emits ROLE_ADMIN', async () => {
      currentUserSubject.next(mockAdminUser);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.isAdmin).toBeTrue();
    });

    it('should set isAdmin = false when currentUser$ emits USER role', async () => {
      currentUserSubject.next(mockRegularUser);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.isAdmin).toBeFalse();
    });

    it('should set isAdmin = false when currentUser$ emits BANNED role', async () => {
      currentUserSubject.next(mockBannedUser);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.isAdmin).toBeFalse();
    });

    it('should set isAdmin = false when currentUser$ emits user with no role', async () => {
      currentUserSubject.next({ ...mockRegularUser, role: undefined });
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.isAdmin).toBeFalse();
    });

    it('should set isAdmin = false when currentUser$ emits null', async () => {
      currentUserSubject.next(null);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.isAdmin).toBeFalse();
    });

    it('should update isAdmin when currentUser$ value changes after init', async () => {
      currentUserSubject.next(mockRegularUser);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.isAdmin).toBeFalse();

      currentUserSubject.next(mockAdminUser);
      await fixture.whenStable();
      expect(component.isAdmin).toBeTrue();
    });

    it('should update isAdmin from null to true when user data loads', async () => {
      currentUserSubject.next(null);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.isAdmin).toBeFalse();

      currentUserSubject.next(mockAdminUser);
      await fixture.whenStable();
      expect(component.isAdmin).toBeTrue();
    });
  });

  describe('Admin button in template', () => {
    it('should render admin button for admin user', async () => {
      currentUserSubject.next(mockAdminUser);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const adminBtn = fixture.nativeElement.querySelector('a[routerLink="/admin"]');
      expect(adminBtn).toBeTruthy();
    });

    it('should NOT render admin button for regular user', async () => {
      currentUserSubject.next(mockRegularUser);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const adminBtn = fixture.nativeElement.querySelector('a[routerLink="/admin"]');
      expect(adminBtn).toBeNull();
    });

    it('should NOT render admin button for banned user', async () => {
      currentUserSubject.next(mockBannedUser);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const adminBtn = fixture.nativeElement.querySelector('a[routerLink="/admin"]');
      expect(adminBtn).toBeNull();
    });

    it('admin button should contain text "Админ-панель"', async () => {
      currentUserSubject.next(mockAdminUser);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const adminBtn = fixture.nativeElement.querySelector('a[routerLink="/admin"]');
      expect(adminBtn.textContent).toContain('Админ-панель');
    });

    it('admin button should have danger outline class', async () => {
      currentUserSubject.next(mockAdminUser);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const adminBtn = fixture.nativeElement.querySelector('a[routerLink="/admin"]');
      expect(adminBtn.classList.contains('btn-outline-danger')).toBeTrue();
    });

    it('admin button should link to /admin', async () => {
      currentUserSubject.next(mockAdminUser);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const adminBtn = fixture.nativeElement.querySelector('a[routerLink="/admin"]');
      expect(adminBtn.getAttribute('routerlink')).toBe('/admin');
    });

    it('admin button should contain shield-lock icon', async () => {
      currentUserSubject.next(mockAdminUser);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const icon = fixture.nativeElement.querySelector('a[routerLink="/admin"] i.bi-shield-lock');
      expect(icon).toBeTruthy();
    });

    it('edit button should always be visible regardless of admin status', async () => {
      currentUserSubject.next(mockRegularUser);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const allLinks = fixture.nativeElement.querySelectorAll('a.btn');
      const editBtn = Array.from(allLinks).find((el: any) =>
        el.textContent.includes('Редактировать')
      ) as HTMLElement;
      expect(editBtn).toBeTruthy();
      expect(editBtn.textContent).toContain('Редактировать');
    });

    it('admin button should appear below edit button', async () => {
      currentUserSubject.next(mockAdminUser);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const allLinks = fixture.nativeElement.querySelectorAll('a.btn');
      const editBtn = Array.from(allLinks).find((el: any) =>
        el.textContent.includes('Редактировать')
      ) as HTMLElement;
      const adminBtn = fixture.nativeElement.querySelector('a[routerLink="/admin"]');
      expect(editBtn).toBeTruthy();
      expect(adminBtn).toBeTruthy();

      const editRect = editBtn.getBoundingClientRect();
      const adminRect = adminBtn.getBoundingClientRect();
      expect(adminRect.y).toBeGreaterThan(editRect.y);
    });

    it('admin button appears dynamically when user loads after initial null state', async () => {
      currentUserSubject.next(null);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      let adminBtn = fixture.nativeElement.querySelector('a[routerLink="/admin"]');
      expect(adminBtn).toBeNull();

      currentUserSubject.next(mockAdminUser);
      await fixture.whenStable();
      fixture.detectChanges();

      adminBtn = fixture.nativeElement.querySelector('a[routerLink="/admin"]');
      expect(adminBtn).toBeTruthy();
    });
  });
});
