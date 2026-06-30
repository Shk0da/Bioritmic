const ALLOWED_PATH_PREFIXES = ['/mailbox', '/meetings', '/swipe', '/profile', '/settings', '/bookmarks', '/user/'];

export function sanitizePushNavigationUrl(url: string | undefined | null): string {
  if (!url || typeof url !== 'string') {
    return '/';
  }

  const trimmed = url.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return '/';
  }
  if (trimmed.includes('://') || trimmed.includes('\\')) {
    return '/';
  }

  const path = trimmed.split('?')[0].split('#')[0];
  if (path === '/') {
    return '/';
  }

  const allowed = ALLOWED_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
  return allowed ? trimmed.split('#')[0] : '/';
}

export function resolvePushNotificationUrl(data?: Record<string, string | undefined> | null): string {
  if (data?.['url']) {
    return sanitizePushNavigationUrl(data['url']);
  }

  const type = data?.['type'];
  const userId = data?.['userId'];
  if (type === 'mailbox') {
    return userId ? sanitizePushNavigationUrl(`/mailbox/${userId}`) : '/mailbox';
  }
  if (type === 'meeting') {
    return '/meetings';
  }
  return '/';
}
