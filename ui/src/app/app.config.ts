import { ApplicationConfig } from '@angular/core';
import { provideRouter, withComponentInputBinding, withPreloading, PreloadAllModules, withViewTransitions, RouteReuseStrategy } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { serverErrorInterceptor } from './core/interceptors/server-error.interceptor';
import { isLayoutCachingEnabled } from './core/routing/layout-cache.util';
import { MobileRouteReuseStrategy, provideMobileRouteReuseStrategy } from './core/routing/mobile-route-reuse.strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withPreloading(PreloadAllModules),
      withComponentInputBinding(),
      // View transitions conflict with detached route cache on mobile/PWA.
      ...(isLayoutCachingEnabled() ? [] : [withViewTransitions()]),
    ),
    {
      provide: RouteReuseStrategy,
      useFactory: provideMobileRouteReuseStrategy,
    },
    provideHttpClient(withInterceptors([authInterceptor, serverErrorInterceptor]))
  ]
};
