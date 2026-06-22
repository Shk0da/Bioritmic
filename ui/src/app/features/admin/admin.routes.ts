import { Routes } from '@angular/router';
import { AdminComponent } from './admin.component';
import { adminGuard } from '../../core/guards/admin.guard';

export const ADMIN_ROUTES: Routes = [
  { path: '', component: AdminComponent, canActivate: [adminGuard] }
];
