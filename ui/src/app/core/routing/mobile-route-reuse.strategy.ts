import {
  ActivatedRouteSnapshot,
  DetachedRouteHandle,
  RouteReuseStrategy,
} from '@angular/router';
import {
  buildRouteCacheKey,
  shouldCacheRoute,
} from './layout-cache.util';

const MAX_CACHED_ROUTES = 12;

const MAIN_TAB_CACHE_KEYS = new Set([
  'swipe',
  'bookmarks',
  'mailbox',
  'meetings',
  'profile/me',
  'settings',
]);

function isProtectedCacheKey(key: string): boolean {
  return MAIN_TAB_CACHE_KEYS.has(key);
}

export class MobileRouteReuseStrategy implements RouteReuseStrategy {
  private readonly storedRoutes = new Map<string, DetachedRouteHandle>();

  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    return shouldCacheRoute(route);
  }

  store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle): void {
    if (!shouldCacheRoute(route)) {
      return;
    }

    const key = buildRouteCacheKey(route);
    if (this.storedRoutes.size >= MAX_CACHED_ROUTES && !this.storedRoutes.has(key)) {
      this.evictOne();
    }

    this.storedRoutes.set(key, handle);
  }

  private evictOne(): void {
    for (const cachedKey of this.storedRoutes.keys()) {
      if (!isProtectedCacheKey(cachedKey)) {
        this.storedRoutes.delete(cachedKey);
        return;
      }
    }

    const oldestKey = this.storedRoutes.keys().next().value;
    if (oldestKey) {
      this.storedRoutes.delete(oldestKey);
    }
  }

  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    if (!shouldCacheRoute(route)) {
      return false;
    }

    return this.storedRoutes.has(buildRouteCacheKey(route));
  }

  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    if (!shouldCacheRoute(route)) {
      return null;
    }

    return this.storedRoutes.get(buildRouteCacheKey(route)) ?? null;
  }

  shouldReuseRoute(
    future: ActivatedRouteSnapshot,
    curr: ActivatedRouteSnapshot,
  ): boolean {
    return future.routeConfig === curr.routeConfig;
  }

  clearCache(): void {
    this.storedRoutes.clear();
  }
}

let activeStrategy: MobileRouteReuseStrategy | null = null;

export function provideMobileRouteReuseStrategy(): MobileRouteReuseStrategy {
  const strategy = new MobileRouteReuseStrategy();
  activeStrategy = strategy;
  return strategy;
}

export function clearLayoutRouteCache(): void {
  activeStrategy?.clearCache();
}
