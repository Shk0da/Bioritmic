import { TestBed } from '@angular/core/testing';
import { ShareService } from './share.service';

describe('ShareService', () => {
  let service: ShareService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ShareService);
  });

  it('should build profile url from current origin', () => {
    expect(service.buildProfileUrl('abc-123')).toBe(`${window.location.origin}/user/abc-123`);
  });

  it('should copy link when native share is unavailable', async () => {
    const writeText = jasmine.createSpy('writeText').and.returnValue(Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText }
    });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: undefined
    });

    const result = await service.shareProfile('user-1', 'Anna');

    expect(result).toBe('copied');
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/user/user-1`);
  });

  it('should use native share when available', async () => {
    const share = jasmine.createSpy('share').and.returnValue(Promise.resolve());
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: share
    });

    const result = await service.shareProfile('user-2', 'Ivan');

    expect(result).toBe('shared');
    expect(share).toHaveBeenCalledWith(jasmine.objectContaining({
      url: `${window.location.origin}/user/user-2`,
      title: 'Ivan — Bioritmic'
    }));
  });
});
