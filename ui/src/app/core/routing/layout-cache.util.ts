import { ActivatedRouteSnapshot } from '@angular/router';
import { isStandalonePwa } from '../../shared/utils/pwa.util';

export const LAYOUT_CACHE_ROUTE_DATA = { reuse: true } as const;

export function isLayoutCachingEnabled(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia('(max-width: 767.98px)').matches || isStandalonePwa();
}

/** View Transitions conflict with detached route cache — skip on mobile/PWA. */
export function shouldSkipLayoutViewTransition(): boolean {
  return isLayoutCachingEnabled();
}

export function shouldCacheRoute(route: ActivatedRouteSnapshot): boolean {
  return isLayoutCachingEnabled() && route.routeConfig?.data?.['reuse'] === true;
}

export function buildRouteCacheKey(route: ActivatedRouteSnapshot): string {
  const parts = route.pathFromRoot
    .flatMap(snapshot => snapshot.url.map(segment => segment.path))
    .filter(part => part.length > 0);

  return parts.join('/') || 'root';
}
