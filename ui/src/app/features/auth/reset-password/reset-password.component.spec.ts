import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ResetPasswordComponent } from './reset-password.component';
import { AuthService } from '../../../core/services/auth.service';

describe('ResetPasswordComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule, ResetPasswordComponent],
      providers: [
        AuthService,
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (key: string) => (key === 'code' ? 'abc123' : null)
              }
            }
          }
        }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should prefill code from query params', () => {
    const fixture = TestBed.createComponent(ResetPasswordComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.code).toBe('abc123');
  });

  it('should POST reset-password on submit', () => {
    const fixture = TestBed.createComponent(ResetPasswordComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    component.password = 'newpass1';
    component.confirmPassword = 'newpass1';
    component.onSubmit();

    const req = httpMock.expectOne('/api/v1/reset-password');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ code: 'abc123', password: 'newpass1' });
    req.flush(null);

    expect(router.navigate).toHaveBeenCalledWith(['/auth/login'], {
      queryParams: { reset: 'success' },
      replaceUrl: true
    });
  });

  it('should reject mismatched passwords', () => {
    const fixture = TestBed.createComponent(ResetPasswordComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    component.password = 'newpass1';
    component.confirmPassword = 'otherpass';
    component.onSubmit();

    httpMock.expectNone('/api/v1/reset-password');
    expect(component.error).toContain('не совпадают');
  });

  it('should reject password shorter than 5 characters', () => {
    const fixture = TestBed.createComponent(ResetPasswordComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    component.password = '1234';
    component.confirmPassword = '1234';
    component.onSubmit();

    httpMock.expectNone('/api/v1/reset-password');
    expect(component.error).toContain('5');
  });
});
