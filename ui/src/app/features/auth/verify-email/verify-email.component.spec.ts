import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { VerifyEmailComponent } from './verify-email.component';
import { AuthService } from '../../../core/services/auth.service';

describe('VerifyEmailComponent', () => {
  let fixture: ComponentFixture<VerifyEmailComponent>;
  let httpMock: HttpTestingController;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    authService = jasmine.createSpyObj('AuthService', [
      'verifyEmail',
      'resendVerificationEmail',
      'loadCurrentUser',
      'isAuthenticated'
    ]);
    authService.isAuthenticated.and.returnValue(true);
    authService.loadCurrentUser.and.returnValue(of({ id: '1', name: 'Test', email: 't@test.com', isVerified: true }));

    TestBed.configureTestingModule({
      imports: [
        VerifyEmailComponent,
        HttpClientTestingModule,
        RouterTestingModule
      ],
      providers: [
        { provide: AuthService, useValue: authService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: { get: () => null } } }
        }
      ]
    });

    fixture = TestBed.createComponent(VerifyEmailComponent);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should verify email with code', () => {
    authService.verifyEmail.and.returnValue(of(void 0));
    const component = fixture.componentInstance;
    component.code = 'test-code';
    component.onSubmit();
    expect(authService.verifyEmail).toHaveBeenCalledWith('test-code');
  });

  it('should resend verification email', () => {
    authService.resendVerificationEmail.and.returnValue(of(void 0));
    const component = fixture.componentInstance;
    component.resend();
    expect(authService.resendVerificationEmail).toHaveBeenCalled();
  });
});
