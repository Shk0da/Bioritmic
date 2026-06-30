import { isStandalonePwa } from './pwa.util';

describe('pwa.util', () => {
  it('isStandalonePwa should be false in a normal browser tab', () => {
    expect(isStandalonePwa()).toBeFalse();
  });
});
