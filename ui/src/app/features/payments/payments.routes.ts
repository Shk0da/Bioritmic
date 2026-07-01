import { Routes } from '@angular/router';
import { PaymentsComponent } from './payments.component';
import { LAYOUT_CACHE_ROUTE_DATA } from '../../core/routing/layout-cache.util';

export const PAYMENTS_ROUTES: Routes = [
  {
    path: '',
    component: PaymentsComponent,
    data: LAYOUT_CACHE_ROUTE_DATA,
  },
];
