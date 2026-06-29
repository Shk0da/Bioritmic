import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { EditProfileComponent } from './edit-profile.component';
import { UserService } from '../../../core/services/user.service';
import { Gender, UserInfo } from '../../../core/models/user.model';

describe('EditProfileComponent', () => {
  let fixture: ComponentFixture<EditProfileComponent>;
  let component: EditProfileComponent;
  let userService: jasmine.SpyObj<UserService>;
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

    await TestBed.configureTestingModule({
      imports: [EditProfileComponent, RouterTestingModule],
      providers: [{ provide: UserService, useValue: userService }]
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
    expect(userService.resolveProfilePhotoUrl).toHaveBeenCalledWith('1');
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

  it('should save name, birthday, gender and bio', () => {
    fixture.detectChanges();
    component.save();
    expect(userService.updateUser).toHaveBeenCalledWith({
      name: 'Test User',
      birthday: '1990-01-01',
      gender: Gender.MAN,
      bio: 'Hello world'
    });
    expect(router.navigate).toHaveBeenCalledWith(['/profile/me']);
  });

  it('should validate form fields', () => {
    fixture.detectChanges();
    expect(component.isFormValid()).toBeTrue();
    component.user.name = '';
    expect(component.isFormValid()).toBeFalse();
  });

  it('should delete photo after confirmation', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    fixture.detectChanges();
    expect(component.hasUploadedPhoto).toBeTrue();
    component.deletePhoto();
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
