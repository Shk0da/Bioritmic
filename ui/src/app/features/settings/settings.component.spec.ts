import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { SettingsComponent } from './settings.component';
import { SettingsService } from '../../core/services/settings.service';
import { AuthService } from '../../core/services/auth.service';
import { Gender } from '../../core/models/user.model';

describe('SettingsComponent', () => {
  let fixture: ComponentFixture<SettingsComponent>;
  let component: SettingsComponent;
  let settingsService: jasmine.SpyObj<SettingsService>;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    settingsService = jasmine.createSpyObj('SettingsService', ['getSettings', 'updateSettings']);
    settingsService.getSettings.and.returnValue(of({ gender: Gender.WOMAN, ageMin: 20, ageMax: 40, distance: 30 }));
    settingsService.updateSettings.and.returnValue(of({}));

    authService = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    authService.getCurrentUser.and.returnValue({ id: '1', name: 'Test', email: 't@t.com', gender: Gender.MAN });

    await TestBed.configureTestingModule({
      imports: [SettingsComponent, RouterTestingModule],
      providers: [
        { provide: SettingsService, useValue: settingsService },
        { provide: AuthService, useValue: authService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    spyOn(window, 'alert');
  });

  it('should load settings on init', () => {
    fixture.detectChanges();
    expect(settingsService.getSettings).toHaveBeenCalled();
    expect(component.settings.ageMin).toBe(20);
  });

  it('should save settings', () => {
    fixture.detectChanges();
    component.save();
    expect(settingsService.updateSettings).toHaveBeenCalledWith(component.settings);
  });

  it('onAgeRangeChange should keep ageMax above ageMin', () => {
    component.settings.ageMin = 50;
    component.settings.ageMax = 50;
    component.onAgeRangeChange();
    expect(component.settings.ageMax).toBe(51);
  });

  it('onAgeRangeChange should pull min back when both sliders reach max', () => {
    component.settings.ageMin = 100;
    component.settings.ageMax = 100;
    component.onAgeRangeChange();
    expect(component.settings.ageMin).toBe(99);
    expect(component.settings.ageMax).toBe(100);
  });
});
