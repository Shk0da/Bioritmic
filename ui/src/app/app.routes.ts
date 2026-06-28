import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { LayoutComponent } from './shared/layout/layout.component';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES)
  },
  {
    path: 'error',
    loadChildren: () => import('./features/error/error.routes').then(m => m.ERROR_ROUTES)
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'swipe',
        pathMatch: 'full'
      },
      {
        path: 'swipe',
        loadChildren: () => import('./features/swipe/swipe.routes').then(m => m.SWIPE_ROUTES)
      },
      {
        path: 'search',
        loadChildren: () => import('./features/search/search.routes').then(m => m.SEARCH_ROUTES)
      },
      {
        path: 'profile',
        loadChildren: () => import('./features/profile/profile.routes').then(m => m.PROFILE_ROUTES)
      },
      {
        path: 'user/:id',
        loadChildren: () => import('./features/user-detail/user-detail.routes').then(m => m.USER_DETAIL_ROUTES)
      },
      {
        path: 'bookmarks',
        loadChildren: () => import('./features/bookmarks/bookmarks.routes').then(m => m.BOOKMARKS_ROUTES)
      },
      {
        path: 'mailbox',
        loadChildren: () => import('./features/mailbox/mailbox.routes').then(m => m.MAILBOX_ROUTES)
      },
      {
        path: 'meetings',
        loadChildren: () => import('./features/meetings/meetings.routes').then(m => m.MEETINGS_ROUTES)
      },
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES)
      },
      {
        path: 'settings',
        loadChildren: () => import('./features/settings/settings.routes').then(m => m.SETTINGS_ROUTES)
      },
      {
        path: 'subscription',
        loadChildren: () => import('./features/subscription/subscription.routes').then(m => m.SUBSCRIPTION_ROUTES)
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'error/404'
  }
];
