import { Routes } from '@angular/router';
import { LayoutComponent } from '../../shared/layout/layout.component';
import { MailboxComponent } from './mailbox.component';
import { ConversationComponent } from './conversation/conversation.component';

export const MAILBOX_ROUTES: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: '',
        component: MailboxComponent
      },
      {
        path: 'conversation/:userId',
        component: ConversationComponent
      }
    ]
  }
];
