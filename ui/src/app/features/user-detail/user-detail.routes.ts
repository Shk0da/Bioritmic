import { Routes } from '@angular/router';
import { LayoutComponent } from '../../shared/layout/layout.component';
import { UserDetailComponent } from './user-detail.component';

export const USER_DETAIL_ROUTES: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: ':id',
        component: UserDetailComponent
      }
    ]
  }
];
