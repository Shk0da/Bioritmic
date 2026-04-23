import { Routes } from '@angular/router';
import { LayoutComponent } from '../../shared/layout/layout.component';
import { ProfileComponent } from './profile/profile.component';
import { EditProfileComponent } from './edit-profile/edit-profile.component';

export const PROFILE_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'me',
    pathMatch: 'full'
  },
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: 'me',
        component: ProfileComponent
      },
      {
        path: 'me/edit',
        component: EditProfileComponent
      }
    ]
  }
];
