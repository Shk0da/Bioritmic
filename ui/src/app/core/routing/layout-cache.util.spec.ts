import { ActivatedRouteSnapshot } from '@angular/router';
import { buildRouteCacheKey, isLayoutCachingEnabled, shouldSkipLayoutViewTransition } from './layout-cache.util';

describe('layout-cache.util', () => {
  it('buildRouteCacheKey should join url segments', () => {
    const route = {
      pathFromRoot: [
        { url: [{ path: 'mailbox' }] },
        { url: [{ path: 'user-1' }] },
      ],
    } as ActivatedRouteSnapshot;

    expect(buildRouteCacheKey(route)).toBe('mailbox/user-1');
  });

  it('isLayoutCachingEnabled should be false without window', () => {
    const originalWindow = (globalThis as { window?: Window }).window;
    (globalThis as { window?: Window }).window = undefined;
    expect(isLayoutCachingEnabled()).toBeFalse();
    expect(shouldSkipLayoutViewTransition()).toBeFalse();
    (globalThis as { window?: Window }).window = originalWindow;
  });
});
