import { Routes } from '@angular/router';
import { MeetingsComponent } from './meetings.component';
import { LAYOUT_CACHE_ROUTE_DATA } from '../../core/routing/layout-cache.util';

export const MEETINGS_ROUTES: Routes = [
  {
    path: '',
    component: MeetingsComponent,
    data: LAYOUT_CACHE_ROUTE_DATA,
  }
];
