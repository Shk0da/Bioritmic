import { DestroyRef } from '@angular/core';
import {
  PullToRefreshHandler,
  PullToRefreshRouteMatcher,
  PullToRefreshService,
} from './pull-to-refresh.service';
import { urlMatchesRoute } from './route-cache-refresh.util';

export function registerPullToRefresh(
  service: PullToRefreshService,
  destroyRef: DestroyRef,
  routePathOrMatcher: string | PullToRefreshRouteMatcher,
  options: PullToRefreshHandler | (() => PullToRefreshHandler),
): void {
  const routeMatcher: PullToRefreshRouteMatcher = typeof routePathOrMatcher === 'function'
    ? routePathOrMatcher
    : (url) => urlMatchesRoute(url, routePathOrMatcher);

  const handler: PullToRefreshHandler = {
    refresh: async () => {
      await resolveOptions(options).refresh();
    },
    getScrollElement: () => resolveOptions(options).getScrollElement?.() ?? null,
    isEnabled: () => resolveOptions(options).isEnabled?.() ?? true,
  };

  service.register(handler, routeMatcher);
  destroyRef.onDestroy(() => service.unregister(handler));
}

function resolveOptions(
  options: PullToRefreshHandler | (() => PullToRefreshHandler),
): PullToRefreshHandler {
  return typeof options === 'function' ? options() : options;
}
