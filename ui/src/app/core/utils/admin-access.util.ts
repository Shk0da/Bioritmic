export function hasAdminPanelAccess(role?: string | null): boolean {
  if (!role) {
    return false;
  }
  return role.includes('ADMIN') || role.includes('MODERATOR');
}

export function isFullAdmin(role?: string | null): boolean {
  return !!role && role.includes('ADMIN');
}
