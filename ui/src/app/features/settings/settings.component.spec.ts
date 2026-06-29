import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { SettingsComponent } from './settings.component';
import { SettingsService } from '../../core/services/settings.service';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { PushNotificationService } from '../../core/services/push-notification.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { ModalService } from '../../core/services/modal.service';
import { Gender } from '../../core/models/user.model';

describe('SettingsComponent', () => {
  let fixture: ComponentFixture<SettingsComponent>;
  let component: SettingsComponent;
  let settingsService: jasmine.SpyObj<SettingsService>;
  let userService: jasmine.SpyObj<UserService>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    settingsService = jasmine.createSpyObj('SettingsService', ['getSettings', 'updateSettings']);
    settingsService.getSettings.and.returnValue(of({ gender: Gender.WOMAN, ageMin: 20, ageMax: 40, distance: 30 }));
    settingsService.updateSettings.and.returnValue(of({}));

    userService = jasmine.createSpyObj('UserService', ['getBlockedCount', 'deleteUser']);
    userService.getBlockedCount.and.returnValue(of({ count: 3 }));
    userService.deleteUser.and.returnValue(of(void 0));

    authService = jasmine.createSpyObj('AuthService', ['getCurrentUser', 'clearAuth']);
    authService.getCurrentUser.and.returnValue({ id: '1', name: 'Test', email: 't@t.com', gender: Gender.MAN });

    const pushService = jasmine.createSpyObj('PushNotificationService', [
      'isSupported', 'isEnabled', 'isActive', 'getMode', 'syncEnabledWithPermission',
      'isStandalone', 'isIos', 'initialize', 'enable', 'disable', 'setEnabled'
    ]);
    pushService.isSupported.and.returnValue(false);
    pushService.isEnabled.and.returnValue(false);
    pushService.isActive.and.returnValue(false);
    pushService.getMode.and.returnValue(null);
    pushService.isStandalone.and.returnValue(false);
    pushService.isIos.and.returnValue(false);

    const feedbackService = jasmine.createSpyObj('FeedbackService', ['submit']);
    feedbackService.submit.and.returnValue(of(void 0));

    const modalService = jasmine.createSpyObj('ModalService', ['alert', 'confirm']);
    modalService.alert.and.returnValue(Promise.resolve());
    modalService.confirm.and.returnValue(Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [SettingsComponent, RouterTestingModule],
      providers: [
        { provide: SettingsService, useValue: settingsService },
        { provide: UserService, useValue: userService },
        { provide: AuthService, useValue: authService },
        { provide: PushNotificationService, useValue: pushService },
        { provide: FeedbackService, useValue: feedbackService },
        { provide: ModalService, useValue: modalService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    spyOn(window, 'alert');
  });

  it('should load settings and blocked count on init', () => {
    fixture.detectChanges();
    expect(settingsService.getSettings).toHaveBeenCalled();
    expect(userService.getBlockedCount).toHaveBeenCalled();
    expect(component.settings.ageMin).toBe(20);
    expect(component.blockedCount).toBe(3);
  });

  it('should save settings', () => {
    fixture.detectChanges();
    component.save();
    expect(settingsService.updateSettings).toHaveBeenCalledWith(component.settings);
  });

  it('should delete account after confirmation', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    fixture.detectChanges();
    component.deleteAccount();
    expect(userService.deleteUser).toHaveBeenCalled();
    expect(authService.clearAuth).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('should not delete account when confirmation is cancelled', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    fixture.detectChanges();
    component.deleteAccount();
    expect(userService.deleteUser).not.toHaveBeenCalled();
  });
});
