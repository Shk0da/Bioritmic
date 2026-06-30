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
    expect(isUserStatusPosition('CUSTOM:42:58')).toBeTrue();
    expect(isUserStatusPosition('CENTER')).toBeFalse();
  });

  it('should clamp custom coordinates when normalizing', () => {
    expect(normalizeUserStatusPosition('CUSTOM:150:999')).toBe('CUSTOM:100:100');
  });

  it('should return css coordinates for each position', () => {
    expect(statusPositionStyles('TOP_LEFT')).toEqual({ top: '8%', left: '8%' });
    expect(statusPositionStyles('BOTTOM_CENTER')['transform']).toBe('translateX(-50%)');
    expect(statusPositionStyles('CUSTOM:40:60')).toEqual({
      left: '40%',
      top: '60%',
      transform: 'translate(-50%, -50%)',
    });
  });
});
