import { Routes } from '@angular/router';
import { LayoutComponent } from '../../shared/layout/layout.component';
import { MailboxComponent } from './mailbox.component';

export const MAILBOX_ROUTES: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: '',
        component: MailboxComponent
      }
    ]
  }
];
