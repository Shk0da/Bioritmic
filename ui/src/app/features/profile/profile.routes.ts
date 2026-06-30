import { Routes } from '@angular/router';
import { ProfileComponent } from './profile/profile.component';
import { EditProfileComponent } from './edit-profile/edit-profile.component';
import { LAYOUT_CACHE_ROUTE_DATA } from '../../core/routing/layout-cache.util';

export const PROFILE_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'me',
    pathMatch: 'full'
  },
  {
    path: 'me',
    component: ProfileComponent,
    data: LAYOUT_CACHE_ROUTE_DATA,
  },
  {
    path: 'me/edit',
    component: EditProfileComponent,
    data: LAYOUT_CACHE_ROUTE_DATA,
  }
];
