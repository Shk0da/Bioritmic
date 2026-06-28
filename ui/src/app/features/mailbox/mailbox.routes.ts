import { Routes } from '@angular/router';
import { MailboxComponent } from './mailbox.component';

export const MAILBOX_ROUTES: Routes = [
  {
    path: '',
    component: MailboxComponent
  },
  {
    path: 'conversation/:userId',
    redirectTo: ':userId',
    pathMatch: 'full'
  },
  {
    path: ':userId',
    component: MailboxComponent
  }
];
