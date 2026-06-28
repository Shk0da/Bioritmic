import { Routes } from '@angular/router';
import { SettingsComponent } from './settings.component';
import { LocationComponent } from './location/location.component';
import { BlockedUsersComponent } from './blocked-users/blocked-users.component';

export const SETTINGS_ROUTES: Routes = [
  {
    path: '',
    component: SettingsComponent
  },
  {
    path: 'location',
    component: LocationComponent
  },
  {
    path: 'blocked',
    component: BlockedUsersComponent
  }
];
