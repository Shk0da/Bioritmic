import {
  DEFAULT_USER_STATUS_POSITION,
  isUserStatusPosition,
  normalizeUserStatusPosition,
  statusPositionStyles,
} from './user-status.util';

describe('user-status.util', () => {
  it('should normalize unknown position to default', () => {
    expect(normalizeUserStatusPosition('UNKNOWN')).toBe(DEFAULT_USER_STATUS_POSITION);
    expect(normalizeUserStatusPosition('TOP_RIGHT')).toBe('TOP_RIGHT');
  });

  it('should validate known positions', () => {
    expect(isUserStatusPosition('BOTTOM_CENTER')).toBeTrue();
    expect(isUserStatusPosition('CENTER')).toBeFalse();
  });

  it('should return css coordinates for each position', () => {
    expect(statusPositionStyles('TOP_LEFT')).toEqual({ top: '8%', left: '8%' });
    expect(statusPositionStyles('BOTTOM_CENTER')['transform']).toBe('translateX(-50%)');
  });
});
