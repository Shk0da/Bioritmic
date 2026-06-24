import { TestBed } from '@angular/core/testing';
import { ThemeService, Theme } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should default to light when no stored preference', () => {
    expect(service.theme()).toBe('light');
  });

  it('should restore dark theme from localStorage', () => {
    TestBed.resetTestingModule();
    localStorage.setItem('bioritmic_theme', 'dark');
    TestBed.configureTestingModule({});
    const fresh = TestBed.inject(ThemeService);
    expect(fresh.theme()).toBe('dark');
  });

  it('constructor should apply initial theme to document', () => {
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('should toggle from light to dark', () => {
    service.theme.set('light');
    service.toggle();
    expect(service.theme()).toBe('dark');
  });

  it('should toggle from dark to light', () => {
    service.theme.set('dark');
    service.toggle();
    expect(service.theme()).toBe('light');
  });

  it('isDark should return true when dark', () => {
    service.theme.set('dark');
    expect(service.isDark()).toBeTrue();
  });

  it('isDark should return false when light', () => {
    service.theme.set('light');
    expect(service.isDark()).toBeFalse();
  });

  it('constructor should persist initial theme to localStorage', () => {
    expect(localStorage.getItem('bioritmic_theme')).toBe('light');
  });
});
