import { Routes } from '@angular/router';
import { LayoutComponent } from '../../shared/layout/layout.component';
import { AdminComponent } from './admin.component';
import { adminGuard } from '../../core/guards/admin.guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: LayoutComponent,
    canActivate: [adminGuard],
    children: [
      {
        path: '',
        component: AdminComponent
      }
    ]
  }
];
