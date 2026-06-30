import { of } from 'rxjs';
import { SwipeComponent } from './swipe.component';
import { SwipeDirection, SwipeCard, UserInfo } from '../../core/models/user.model';

describe('SwipeComponent', () => {
  function createCard(id?: string): SwipeCard {
    return {
      user: {
        id,
        name: id ? `User ${id}` : 'Unknown',
      } as UserInfo,
      photoDataUrl: null,
      isLiked: false,
      isSuperLiked: false,
    };
  }

  function createComponent(cards: SwipeCard[] = []) {
    const searchService = jasmine.createSpyObj('SearchService', ['searchByFilter']);
    const userService = jasmine.createSpyObj('UserService', ['getUserSettings', 'getGisData', 'getPhoto', 'getProfilePhotoUrl']);
    const geoService = jasmine.createSpyObj('GeoService', ['reverseGeocode']);
    const bookmarksService = jasmine.createSpyObj('BookmarksService', ['addBookmark']);
    const swipeService = jasmine.createSpyObj('SwipeService', ['getCards', 'swipe', 'setCards', 'getCurrentIndex', 'canUndo', 'undo']);
    const matchService = jasmine.createSpyObj('MatchService', ['checkMatch']);
    const subscriptionService = jasmine.createSpyObj('SubscriptionService', ['getSwipeLimit']);
    const authService = jasmine.createSpyObj('AuthService', [], { currentUser$: of(null) });
    const swipeActionService = jasmine.createSpyObj('SwipeActionService', ['skipUser']);
    const shareService = jasmine.createSpyObj('ShareService', ['shareProfile']);
    const modalService = jasmine.createSpyObj('ModalService', ['alert']);
    const router = jasmine.createSpyObj('Router', ['navigate']);

    userService.getUserSettings.and.returnValue(of({}));
    userService.getGisData.and.returnValue(of({ lat: 55.7558, lon: 37.6173 }));
    geoService.reverseGeocode.and.returnValue(of({ placeName: 'Moscow' }));
    bookmarksService.addBookmark.and.returnValue(of([]));
    matchService.checkMatch.and.returnValue(of({ isMatch: false }));
    swipeActionService.skipUser.and.returnValue(of({ success: true }));
    swipeService.getCards.and.returnValue(cards);
    swipeService.getCurrentIndex.and.returnValue(0);
    authService.getCurrentUser = jasmine.createSpy('getCurrentUser').and.returnValue({ id: 'me', name: 'Me', isVerified: true });

    const component = new SwipeComponent(
      searchService,
      userService,
      geoService,
      bookmarksService,
      swipeService,
      matchService,
      subscriptionService,
      authService,
      swipeActionService,
      shareService,
      modalService,
      router
    );
    component.cards = [...cards];
    return { component, bookmarksService, swipeService, matchService, swipeActionService };
  }

  it('removeCard should remove card from both component and swipe service lists and call skip', () => {
    const cardA = createCard('a');
    const cardB = createCard('b');
    const serviceCards = [cardA, cardB];
    const { component, swipeActionService } = createComponent(serviceCards);

    component.removeCard(cardA);

    expect(component.cards.map((c) => c.user.id)).toEqual(['b']);
    expect(serviceCards.map((c) => c.user.id)).toEqual(['b']);
    expect(swipeActionService.skipUser).toHaveBeenCalledWith('a');
  });

  it('likeProfile should remove card and call bookmark + match check', () => {
    const cardA = createCard('a');
    const cardB = createCard('b');
    const serviceCards = [cardA, cardB];
    const { component, bookmarksService, matchService } = createComponent(serviceCards);

    component.likeProfile(cardA);

    expect(component.cards.map((c) => c.user.id)).toEqual(['b']);
    expect(serviceCards.map((c) => c.user.id)).toEqual(['b']);
    expect(bookmarksService.addBookmark).toHaveBeenCalledWith({ userId: 'a' });
    expect(matchService.checkMatch).toHaveBeenCalledWith('a');
  });

  it('removeCard should not call skip when card has no user id', () => {
    const card = createCard(undefined);
    const serviceCards = [card];
    const { component, swipeActionService } = createComponent(serviceCards);

    component.removeCard(card);

    expect(swipeActionService.skipUser).not.toHaveBeenCalled();
  });
});

