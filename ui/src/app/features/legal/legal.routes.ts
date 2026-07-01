import { Routes } from '@angular/router';
import { UserAgreementComponent } from './user-agreement.component';
import { PrivacyPolicyComponent } from './privacy-policy.component';

export const LEGAL_ROUTES: Routes = [
  {
    path: 'user-agreement',
    component: UserAgreementComponent,
  },
  {
    path: 'privacy-policy',
    component: PrivacyPolicyComponent,
  },
];
