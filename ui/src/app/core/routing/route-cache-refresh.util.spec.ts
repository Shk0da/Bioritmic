import { DestroyRef } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import {
  normalizeRouteUrl,
  subscribeCachedRouteRefresh,
  urlMatchesRoute,
} from './route-cache-refresh.util';

describe('route-cache-refresh.util', () => {
  it('normalizeRouteUrl should strip query and hash', () => {
    expect(normalizeRouteUrl('/bookmarks?x=1#top')).toBe('/bookmarks');
  });

  it('urlMatchesRoute should match exact and nested paths', () => {
    expect(urlMatchesRoute('/bookmarks', '/bookmarks')).toBeTrue();
    expect(urlMatchesRoute('/bookmarks/extra', '/bookmarks')).toBeTrue();
    expect(urlMatchesRoute('/mailbox', '/bookmarks')).toBeFalse();
  });

  it('subscribeCachedRouteRefresh should skip first navigation and refresh later', () => {
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

    const events$ = new Subject<NavigationEnd>();
    const router = { events: events$.asObservable() } as Router;
    const destroyRef = {
      onDestroy: (callback: () => void) => callback,
    } as DestroyRef;
    const refreshSpy = jasmine.createSpy('refresh');

    subscribeCachedRouteRefresh(router, destroyRef, '/bookmarks', refreshSpy);

    events$.next(new NavigationEnd(1, '/bookmarks', '/bookmarks'));
    expect(refreshSpy).not.toHaveBeenCalled();

    events$.next(new NavigationEnd(2, '/bookmarks', '/bookmarks'));
    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });
});
