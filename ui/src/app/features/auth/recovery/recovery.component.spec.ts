import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { RecoveryComponent } from './recovery.component';
import { AuthService } from '../../../core/services/auth.service';

describe('RecoveryComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule, RecoveryComponent],
      providers: [AuthService]
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should POST recovery and show confirmation', () => {
    const fixture = TestBed.createComponent(RecoveryComponent);
    const component = fixture.componentInstance;
    component.email = 'user@test.com';
    fixture.detectChanges();

    component.sendRecoveryLink();

    const req = httpMock.expectOne('/api/v1/recovery');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'user@test.com' });
    req.flush(null);

    fixture.detectChanges();
    expect(component.linkSent).toBeTrue();
  });
});
