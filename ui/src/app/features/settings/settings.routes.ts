import { Routes } from '@angular/router';
import { SettingsHubComponent } from './settings-hub/settings-hub.component';
import { SettingsComponent } from './settings.component';
import { LocationComponent } from './location/location.component';
import { BlockedUsersComponent } from './blocked-users/blocked-users.component';
import { NotificationsSettingsComponent } from './notifications-settings/notifications-settings.component';
import { FeedbackSettingsComponent } from './feedback-settings/feedback-settings.component';
import { DangerZoneSettingsComponent } from './danger-zone-settings/danger-zone-settings.component';
import { LAYOUT_CACHE_ROUTE_DATA } from '../../core/routing/layout-cache.util';

export const SETTINGS_ROUTES: Routes = [
  {
    path: '',
    component: SettingsHubComponent,
    data: LAYOUT_CACHE_ROUTE_DATA,
  },
  {
    path: 'search',
    component: SettingsComponent,
    data: LAYOUT_CACHE_ROUTE_DATA,
  },
  {
    path: 'notifications',
    component: NotificationsSettingsComponent,
    data: LAYOUT_CACHE_ROUTE_DATA,
  },
  {
    path: 'location',
    component: LocationComponent,
    data: LAYOUT_CACHE_ROUTE_DATA,
  },
  {
    path: 'feedback',
    component: FeedbackSettingsComponent,
    data: LAYOUT_CACHE_ROUTE_DATA,
  },
  {
    path: 'danger',
    component: DangerZoneSettingsComponent,
    data: LAYOUT_CACHE_ROUTE_DATA,
  },
  {
    path: 'blocked',
    component: BlockedUsersComponent,
    data: LAYOUT_CACHE_ROUTE_DATA,
  }
];
