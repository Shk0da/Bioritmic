import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'search',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES)
  },
  {
    path: 'search',
    canActivate: [authGuard],
    loadChildren: () => import('./features/search/search.routes').then(m => m.SEARCH_ROUTES)
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadChildren: () => import('./features/profile/profile.routes').then(m => m.PROFILE_ROUTES)
  },
  {
    path: 'user/:id',
    canActivate: [authGuard],
    loadChildren: () => import('./features/user-detail/user-detail.routes').then(m => m.USER_DETAIL_ROUTES)
  },
  {
    path: 'bookmarks',
    canActivate: [authGuard],
    loadChildren: () => import('./features/bookmarks/bookmarks.routes').then(m => m.BOOKMARKS_ROUTES)
  },
  {
    path: 'mailbox',
    canActivate: [authGuard],
    loadChildren: () => import('./features/mailbox/mailbox.routes').then(m => m.MAILBOX_ROUTES)
  },
  {
    path: 'meetings',
    canActivate: [authGuard],
    loadChildren: () => import('./features/meetings/meetings.routes').then(m => m.MEETINGS_ROUTES)
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    loadChildren: () => import('./features/settings/settings.routes').then(m => m.SETTINGS_ROUTES)
  },
  {
    path: '**',
    redirectTo: 'search'
  }
];
