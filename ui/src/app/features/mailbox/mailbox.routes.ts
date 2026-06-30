import { Routes } from '@angular/router';
import { MailboxComponent } from './mailbox.component';
import { LAYOUT_CACHE_ROUTE_DATA } from '../../core/routing/layout-cache.util';

export const MAILBOX_ROUTES: Routes = [
  {
    path: '',
    component: MailboxComponent,
    data: LAYOUT_CACHE_ROUTE_DATA,
  },
  {
    path: 'conversation/:userId',
    redirectTo: ':userId',
    pathMatch: 'full'
  },
  {
    path: ':userId',
    component: MailboxComponent,
    data: LAYOUT_CACHE_ROUTE_DATA,
  }
];
