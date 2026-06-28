import { Routes } from '@angular/router';
import { ProfileComponent } from './profile/profile.component';
import { EditProfileComponent } from './edit-profile/edit-profile.component';

export const PROFILE_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'me',
    pathMatch: 'full'
  },
  {
    path: 'me',
    component: ProfileComponent
  },
  {
    path: 'me/edit',
    component: EditProfileComponent
  }
];
