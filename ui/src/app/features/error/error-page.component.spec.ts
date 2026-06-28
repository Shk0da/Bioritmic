import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ErrorPageComponent } from './error-page.component';
import { AuthService } from '../../core/services/auth.service';

describe('ErrorPageComponent', () => {
  let component: ErrorPageComponent;
  let fixture: import('@angular/core/testing').ComponentFixture<ErrorPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ErrorPageComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isAuthenticated: () => false } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ErrorPageComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('code', '404');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show 404 content by default', () => {
    expect(component.displayCode()).toBe('404');
    expect(component.title()).toBe('Страница не найдена');
  });

  it('should show 500 content when code is 500', () => {
    fixture.componentRef.setInput('code', '500');
    fixture.detectChanges();
    expect(component.displayCode()).toBe('500');
    expect(component.title()).toBe('Сервер временно недоступен');
    expect(component.showReload()).toBeTrue();
  });

  it('should show 401 content when code is 401', () => {
    fixture.componentRef.setInput('code', '401');
    fixture.detectChanges();
    expect(component.displayCode()).toBe('401');
    expect(component.primaryLink()).toBe('/auth/login');
  });

  it('should show 403 content when code is 403', () => {
    fixture.componentRef.setInput('code', '403');
    fixture.detectChanges();
    expect(component.displayCode()).toBe('403');
    expect(component.title()).toBe('Доступ запрещён');
  });
});
