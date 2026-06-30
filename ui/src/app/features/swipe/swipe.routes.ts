import { Routes } from '@angular/router';
import { SwipeComponent } from './swipe.component';
import { LAYOUT_CACHE_ROUTE_DATA } from '../../core/routing/layout-cache.util';

export const SWIPE_ROUTES: Routes = [
  {
    path: '',
    component: SwipeComponent,
    data: LAYOUT_CACHE_ROUTE_DATA,
  }
];
