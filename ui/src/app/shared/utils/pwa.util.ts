/** True when the app runs from the home screen (iOS Safari or installed PWA). */
export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function initStandalonePwaClass(): void {
  document.documentElement.classList.toggle('pwa-standalone', isStandalonePwa());
}
