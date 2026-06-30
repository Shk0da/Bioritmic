import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { EditProfileComponent } from './edit-profile.component';
import { UserService } from '../../../core/services/user.service';
import { ModalService } from '../../../core/services/modal.service';
import { Gender, UserInfo } from '../../../core/models/user.model';

describe('EditProfileComponent', () => {
  let fixture: ComponentFixture<EditProfileComponent>;
  let component: EditProfileComponent;
  let userService: jasmine.SpyObj<UserService>;
  let modalService: jasmine.SpyObj<ModalService>;
  let router: Router;

  const mockUser: UserInfo = {
    id: '1',
    name: 'Test User',
    email: 'test@test.com',
    birthday: '1990-01-01',
    gender: Gender.MAN,
    bio: 'Hello world'
  };

  beforeEach(async () => {
    userService = jasmine.createSpyObj('UserService', [
      'getCurrentUser', 'getUserPhotos', 'resolveProfilePhotoUrl', 'updateUser', 'uploadPhoto', 'deletePhoto', 'getProfilePhotoUrl'
    ]);
    userService.getCurrentUser.and.returnValue(of(mockUser));
    userService.getUserPhotos.and.returnValue(of([{ photoOrder: 0 }]));
    userService.resolveProfilePhotoUrl.and.returnValue(of('/api/v1/user/1/photo?v=1'));
    userService.getProfilePhotoUrl.and.returnValue('/api/v1/user/1/photo?v=2');
    userService.updateUser.and.returnValue(of(mockUser));
    userService.uploadPhoto.and.returnValue(of(void 0));
    userService.deletePhoto.and.returnValue(of(void 0));

    modalService = jasmine.createSpyObj('ModalService', ['confirm', 'alert']);
    modalService.confirm.and.returnValue(Promise.resolve(true));
    modalService.alert.and.returnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      imports: [EditProfileComponent, RouterTestingModule],
      providers: [
        { provide: UserService, useValue: userService },
        { provide: ModalService, useValue: modalService },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EditProfileComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    spyOn(window, 'alert');
  });

  it('should load profile and photo on init', () => {
    fixture.detectChanges();
    expect(userService.getCurrentUser).toHaveBeenCalled();
    expect(userService.resolveProfilePhotoUrl).toHaveBeenCalledWith('1', undefined, 'full');
    expect(component.user.name).toBe('Test User');
    expect(component.user.bio).toBe('Hello world');
    expect(component.user.gender).toBe(Gender.MAN);
    expect(component.photoDataUrl).toBe('/api/v1/user/1/photo?v=1');
  });

  it('should normalize gender from API string value', () => {
    userService.getCurrentUser.and.returnValue(of({ ...mockUser, gender: 'WOMAN' as unknown as Gender }));
    fixture.detectChanges();
    expect(component.user.gender).toBe(Gender.WOMAN);
  });

  it('should save name, birthday, gender, bio and nick', () => {
    fixture.detectChanges();
    component.user.nick = 'my_nick';
    component.save();
    expect(userService.updateUser).toHaveBeenCalledWith({
      name: 'Test User',
      birthday: '1990-01-01',
      gender: Gender.MAN,
      bio: 'Hello world',
      nick: 'my_nick',
    });
    expect(router.navigate).toHaveBeenCalledWith(['/profile/me']);
  });

  it('should not save profile when nick is invalid', () => {
    fixture.detectChanges();
    component.user.nick = 'bad nick!';
    component.save();
    expect(userService.updateUser).not.toHaveBeenCalled();
    expect(component.canSave()).toBeFalse();
  });

  it('should build profile link preview with nick', () => {
    fixture.detectChanges();
    component.user.nick = 'alex_42';
    expect(component.profileLinkPreview).toBe(`${window.location.origin}/user/alex_42`);
  });

  it('should build profile link preview with id when nick is empty', () => {
    fixture.detectChanges();
    expect(component.profileLinkPreview).toBe(`${window.location.origin}/user/1`);
  });

  it('should disable save for invalid nick', () => {
    fixture.detectChanges();
    component.user.nick = 'invalid nick';
    expect(component.canSave()).toBeFalse();
    expect(component.nickFieldHint).toContain('латинские');
  });

  it('should validate form fields', () => {
    fixture.detectChanges();
    expect(component.hasRequiredProfileFields()).toBeTrue();
    expect(component.isProfileValid()).toBeTrue();
    expect(component.canSave()).toBeTrue();
    component.user.name = '';
    expect(component.hasRequiredProfileFields()).toBeFalse();
    expect(component.isProfileValid()).toBeFalse();
    expect(component.canSave()).toBeFalse();
  });

  it('should show birthday hint and block save for underage date', () => {
    fixture.detectChanges();
    component.user.birthday = '2026-06-30';
    expect(component.birthdayFieldHint).toBeTruthy();
    expect(component.isProfileValid()).toBeFalse();
    expect(component.canSave()).toBeTrue();
    component.save();
    expect(modalService.alert).toHaveBeenCalled();
    expect(userService.updateUser).not.toHaveBeenCalled();
  });

  it('should upload photo when birthday is underage but photo is selected', () => {
    fixture.detectChanges();
    component.user.birthday = '2026-06-30';
    component.photoFile = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' });
    component.save();
    expect(modalService.alert).toHaveBeenCalled();
    expect(userService.updateUser).not.toHaveBeenCalled();
    expect(userService.uploadPhoto).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/profile/me']);
  });

  it('should disable save for reserved nick', () => {
    fixture.detectChanges();
    component.user.nick = 'me';
    expect(component.canSave()).toBeFalse();
    expect(component.nickFieldHint).toContain('зарезервирован');
  });

  it('should clear server nick error when user edits nick', () => {
    fixture.detectChanges();
    component.nickError = 'Этот ник уже занят.';
    component.onNickChange();
    expect(component.nickError).toBe('');
  });

  it('should allow save when only a new photo is selected', () => {
    fixture.detectChanges();
    component.user.name = '';
    component.photoFile = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' });
    expect(component.canSave()).toBeTrue();
    component.save();
    expect(userService.updateUser).not.toHaveBeenCalled();
    expect(userService.uploadPhoto).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/profile/me']);
  });

  it('should delete photo after confirmation', async () => {
    fixture.detectChanges();
    expect(component.hasUploadedPhoto).toBeTrue();
    await component.deletePhoto();
    expect(modalService.confirm).toHaveBeenCalled();
    expect(userService.deletePhoto).toHaveBeenCalled();
    expect(component.photoDataUrl).toBeNull();
    expect(component.hasUploadedPhoto).toBeFalse();
  });

  it('should not show delete when user has no uploaded photo', () => {
    userService.getUserPhotos.and.returnValue(of([]));
    fixture.detectChanges();
    expect(component.hasUploadedPhoto).toBeFalse();
  });
});
