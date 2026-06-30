import { Routes } from '@angular/router';
import { SearchComponent } from './search.component';
import { LAYOUT_CACHE_ROUTE_DATA } from '../../core/routing/layout-cache.util';

export const SEARCH_ROUTES: Routes = [
  {
    path: '',
    component: SearchComponent,
    data: LAYOUT_CACHE_ROUTE_DATA,
  }
];
