import { Routes } from '@angular/router';
import { BookmarksComponent } from './bookmarks.component';
import { LAYOUT_CACHE_ROUTE_DATA } from '../../core/routing/layout-cache.util';

export const BOOKMARKS_ROUTES: Routes = [
  {
    path: '',
    component: BookmarksComponent,
    data: LAYOUT_CACHE_ROUTE_DATA,
  }
];
