import { hasAdminPanelAccess, isFullAdmin } from './admin-access.util';

describe('admin-access.util', () => {
  it('hasAdminPanelAccess should allow admin and moderator', () => {
    expect(hasAdminPanelAccess('ROLE_ADMIN')).toBeTrue();
    expect(hasAdminPanelAccess('MODERATOR')).toBeTrue();
    expect(hasAdminPanelAccess('ROLE_USER')).toBeFalse();
    expect(hasAdminPanelAccess(null)).toBeFalse();
  });

  it('isFullAdmin should allow only admin', () => {
    expect(isFullAdmin('ROLE_ADMIN')).toBeTrue();
    expect(isFullAdmin('MODERATOR')).toBeFalse();
    expect(isFullAdmin('ROLE_USER')).toBeFalse();
  });
});
