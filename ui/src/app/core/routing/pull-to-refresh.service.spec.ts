import { PullToRefreshService } from './pull-to-refresh.service';

describe('PullToRefreshService', () => {
  let service: PullToRefreshService;

  beforeEach(() => {
    service = new PullToRefreshService();
  });

  it('should execute the handler that matches the current route', async () => {
    const swipe = jasmine.createSpy('swipe');
    const meetings = jasmine.createSpy('meetings');
    service.register({ refresh: swipe }, (url) => url === '/swipe');
    service.register({ refresh: meetings }, (url) => url === '/meetings');

    service.setCurrentRoute('/swipe');
    await service.execute();

    expect(swipe).toHaveBeenCalled();
    expect(meetings).not.toHaveBeenCalled();
  });

  it('should respect isEnabled for the active route', async () => {
    const refresh = jasmine.createSpy('refresh');
    service.setCurrentRoute('/bookmarks');
    service.register({
      refresh,
      isEnabled: () => false,
    }, (url) => url === '/bookmarks');

    await service.execute();

    expect(refresh).not.toHaveBeenCalled();
  });
});
