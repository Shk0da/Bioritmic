import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { isLayoutCachingEnabled } from './layout-cache.util';

export function normalizeRouteUrl(url: string): string {
  return url.split('?')[0].split('#')[0];
}

export function urlMatchesRoute(url: string, routePath: string): boolean {
  const normalized = normalizeRouteUrl(url);
  if (routePath === '/') {
    return normalized === '/';
  }
  return normalized === routePath || normalized.startsWith(`${routePath}/`);
}

export type RouteRefreshMatcher = (url: string) => boolean;

/**
 * Mobile/PWA route reuse keeps component instances alive (layout/scroll state).
 * ngOnInit runs only on the first visit; tab switches fire NavigationEnd instead.
 */
export function subscribeCachedRouteRefresh(
  router: Router,
  destroyRef: DestroyRef,
  routePathOrMatcher: string | RouteRefreshMatcher,
  onRefresh: () => void,
): void {
  if (!isLayoutCachingEnabled()) {
    return;
  }

  const matches: RouteRefreshMatcher = typeof routePathOrMatcher === 'function'
    ? routePathOrMatcher
    : (url: string) => urlMatchesRoute(url, routePathOrMatcher);

  let skippedInitialNavigation = false;

  router.events.pipe(
    filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    filter((event) => matches(event.urlAfterRedirects)),
    takeUntilDestroyed(destroyRef),
  ).subscribe(() => {
    if (!skippedInitialNavigation) {
      skippedInitialNavigation = true;
      return;
    }
    onRefresh();
  });
}
