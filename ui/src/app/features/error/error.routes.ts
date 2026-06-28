import { Routes } from '@angular/router';

export const ERROR_ROUTES: Routes = [
  {
    path: '',
    redirectTo: '404',
    pathMatch: 'full'
  },
  {
    path: ':code',
    loadComponent: () => import('./error-page.component').then(m => m.ErrorPageComponent)
  }
];
