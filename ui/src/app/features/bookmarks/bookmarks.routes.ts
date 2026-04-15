import { Routes } from '@angular/router';
import { LayoutComponent } from '../../shared/layout/layout.component';
import { BookmarksComponent } from './bookmarks.component';

export const BOOKMARKS_ROUTES: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: '',
        component: BookmarksComponent
      }
    ]
  }
];
