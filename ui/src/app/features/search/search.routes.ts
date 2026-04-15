import { Routes } from '@angular/router';
import { LayoutComponent } from '../../shared/layout/layout.component';
import { SearchComponent } from './search.component';

export const SEARCH_ROUTES: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: '',
        component: SearchComponent
      }
    ]
  }
];
