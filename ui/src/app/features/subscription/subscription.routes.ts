import { Routes } from '@angular/router';
import { SubscriptionComponent } from './subscription.component';
import { LAYOUT_CACHE_ROUTE_DATA } from '../../core/routing/layout-cache.util';

export const SUBSCRIPTION_ROUTES: Routes = [
  {
    path: '',
    component: SubscriptionComponent,
    data: LAYOUT_CACHE_ROUTE_DATA,
  }
];
