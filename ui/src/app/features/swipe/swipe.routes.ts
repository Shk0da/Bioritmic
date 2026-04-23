import { Routes } from '@angular/router';
import { LayoutComponent } from '../../shared/layout/layout.component';
import { SwipeComponent } from './swipe.component';

export const SWIPE_ROUTES: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: '',
        component: SwipeComponent
      }
    ]
  }
];
