import { Routes } from '@angular/router';
import { LayoutComponent } from '../../shared/layout/layout.component';
import { MeetingsComponent } from './meetings.component';

export const MEETINGS_ROUTES: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: '',
        component: MeetingsComponent
      }
    ]
  }
];
