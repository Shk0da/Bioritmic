import { Injectable } from '@angular/core';
import { normalizeRouteUrl } from './route-cache-refresh.util';

export interface PullToRefreshHandler {
  refresh: () => void | Promise<void>;
  getScrollElement?: () => HTMLElement | null | undefined;
  isEnabled?: () => boolean;
}

export type PullToRefreshRouteMatcher = (url: string) => boolean;

interface RegisteredPullToRefreshHandler extends PullToRefreshHandler {
  routeMatcher: PullToRefreshRouteMatcher;
}

@Injectable({ providedIn: 'root' })
export class PullToRefreshService {
  private readonly handlers: RegisteredPullToRefreshHandler[] = [];
  private currentRouteUrl = '/';

  register(handler: PullToRefreshHandler, routeMatcher: PullToRefreshRouteMatcher): void {
    const index = this.handlers.findIndex((entry) => entry.refresh === handler.refresh);
    if (index >= 0) {
      this.handlers.splice(index, 1);
    }
    this.handlers.push({ ...handler, routeMatcher });
  }

  unregister(handler: PullToRefreshHandler): void {
    const index = this.handlers.findIndex((entry) => entry.refresh === handler.refresh);
    if (index >= 0) {
      this.handlers.splice(index, 1);
    }
  }

  setCurrentRoute(url: string): void {
    this.currentRouteUrl = normalizeRouteUrl(url);
  }

  getActive(): PullToRefreshHandler | null {
    for (let index = this.handlers.length - 1; index >= 0; index -= 1) {
      const handler = this.handlers[index];
      if (!handler.routeMatcher(this.currentRouteUrl)) {
        continue;
      }
      if (handler.isEnabled?.() === false) {
        continue;
      }
      return handler;
    }
    return null;
  }

  getScrollTop(): number {
    const element = this.getActive()?.getScrollElement?.();
    if (element) {
      return element.scrollTop;
    }
    if (typeof window === 'undefined') {
      return 0;
    }
    return window.scrollY || document.documentElement.scrollTop || 0;
  }

  canPull(): boolean {
    return this.getActive() != null;
  }

  async execute(): Promise<void> {
    const handler = this.getActive();
    if (!handler) {
      return;
    }
    await handler.refresh();
  }

  clear(): void {
    this.handlers.length = 0;
  }
}
