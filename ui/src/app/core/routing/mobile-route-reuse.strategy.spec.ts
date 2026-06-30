import { ActivatedRouteSnapshot } from '@angular/router';
import { MobileRouteReuseStrategy } from './mobile-route-reuse.strategy';

function routeWithKey(key: string, reuse = true): ActivatedRouteSnapshot {
  const segments = key.split('/').map(path => ({ path }));
  return {
    routeConfig: { data: reuse ? { reuse: true } : {} },
    pathFromRoot: [{ url: segments }],
  } as unknown as ActivatedRouteSnapshot;
}

describe('MobileRouteReuseStrategy', () => {
  let strategy: MobileRouteReuseStrategy;

  beforeEach(() => {
    spyOn(window, 'matchMedia').and.returnValue({
      matches: true,
      media: '(max-width: 767.98px)',
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    } as MediaQueryList);
    strategy = new MobileRouteReuseStrategy();
  });

  it('should evict non-main routes before protected tab routes', () => {
    const protectedHandle = { componentRef: {} } as never;
    const detailHandle = { componentRef: {} } as never;

    strategy.store(routeWithKey('swipe'), protectedHandle);
    strategy.store(routeWithKey('settings/location'), detailHandle);

    for (let i = 0; i < 10; i++) {
      strategy.store(routeWithKey(`mailbox/user-${i}`), { componentRef: {} } as never);
    }

    strategy.store(routeWithKey('profile/me/edit'), { componentRef: {} } as never);

    expect(strategy.retrieve(routeWithKey('settings/location'))).toBeNull();
    expect(strategy.retrieve(routeWithKey('swipe'))).toBe(protectedHandle);
  });

  it('clearCache should remove stored routes', () => {
    strategy.store(routeWithKey('swipe'), { componentRef: {} } as never);
    strategy.clearCache();
    expect(strategy.retrieve(routeWithKey('swipe'))).toBeNull();
  });
});
