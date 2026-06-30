import { Routes } from '@angular/router';
import { SettingsHubComponent } from './settings-hub/settings-hub.component';
import { SettingsComponent } from './settings.component';
import { LocationComponent } from './location/location.component';
import { BlockedUsersComponent } from './blocked-users/blocked-users.component';
import { NotificationsSettingsComponent } from './notifications-settings/notifications-settings.component';
import { FeedbackSettingsComponent } from './feedback-settings/feedback-settings.component';
import { DangerZoneSettingsComponent } from './danger-zone-settings/danger-zone-settings.component';

export const SETTINGS_ROUTES: Routes = [
  {
    path: '',
    component: SettingsHubComponent
  },
  {
    path: 'search',
    component: SettingsComponent
  },
  {
    path: 'notifications',
    component: NotificationsSettingsComponent
  },
  {
    path: 'location',
    component: LocationComponent
  },
  {
    path: 'feedback',
    component: FeedbackSettingsComponent
  },
  {
    path: 'danger',
    component: DangerZoneSettingsComponent
  },
  {
    path: 'blocked',
    component: BlockedUsersComponent
  }
];
