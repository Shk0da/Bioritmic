import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { SwipeComponent } from './swipe.component';
import { SwipeDirection, SwipeCard, UserInfo } from '../../core/models/user.model';
import { UserService } from '../../core/services/user.service';
import { SearchService } from '../../core/services/search.service';
import { GeoService } from '../../core/services/geo.service';
import { BookmarksService } from '../../core/services/bookmarks.service';
import { SwipeService } from '../../core/services/swipe.service';
import { MatchService } from '../../core/services/match.service';
import { AuthService } from '../../core/services/auth.service';
import { SwipeActionService } from '../../core/services/swipe-action.service';
import { ShareService } from '../../core/services/share.service';
import { ModalService } from '../../core/services/modal.service';
import { ToastService } from '../../core/services/toast.service';
import { Router } from '@angular/router';
import { StoryService } from '../../core/services/story.service';

describe('SwipeComponent', () => {
  const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  const pngPlaceholderBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);

  let component: SwipeComponent;
  let userService: jasmine.SpyObj<UserService>;
  let bookmarksService: jasmine.SpyObj<BookmarksService>;
  let swipeService: jasmine.SpyObj<SwipeService>;
  let matchService: jasmine.SpyObj<MatchService>;
  let swipeActionService: jasmine.SpyObj<SwipeActionService>;

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

  function setCards(cards: SwipeCard[]): SwipeCard[] {
    swipeService.getCards.and.returnValue(cards);
    component.cards = [...cards];
    return cards;
  }

  beforeEach(async () => {
    const searchService = jasmine.createSpyObj('SearchService', ['searchByFilter']);
    userService = jasmine.createSpyObj('UserService', [
      'getUserSettings',
      'getGisData',
      'getPhoto',
      'getProfilePhotoUrl',
      'releasePhotoUrl',
    ]);
    const geoService = jasmine.createSpyObj('GeoService', ['reverseGeocode']);
    bookmarksService = jasmine.createSpyObj('BookmarksService', ['addBookmark']);
    swipeService = jasmine.createSpyObj('SwipeService', [
      'getCards',
      'swipe',
      'setCards',
      'getCurrentIndex',
      'undo',
    ]);
    matchService = jasmine.createSpyObj('MatchService', ['checkMatch']);
    const authService = jasmine.createSpyObj('AuthService', ['getCurrentUser'], {
      currentUser$: of(null),
    });
    swipeActionService = jasmine.createSpyObj('SwipeActionService', ['skipUser', 'likeUser']);
    const shareService = jasmine.createSpyObj('ShareService', ['shareProfile']);
    const modalService = jasmine.createSpyObj('ModalService', ['alert']);
    const toastService = jasmine.createSpyObj('ToastService', ['error', 'success']);
    const router = jasmine.createSpyObj('Router', ['navigate']);

    userService.getUserSettings.and.returnValue(of({}));
    userService.getGisData.and.returnValue(of({ userId: 'me', lat: 55.7558, lon: 37.6173 }));
    geoService.reverseGeocode.and.returnValue(of({ placeName: 'Moscow' }));
    bookmarksService.addBookmark.and.returnValue(of([]));
    matchService.checkMatch.and.returnValue(of({ isMatch: false }));
    swipeActionService.skipUser.and.returnValue(of({ success: true }));
    swipeActionService.likeUser.and.returnValue(of({ success: true }));
    swipeService.getCurrentIndex.and.returnValue(0);
    authService.getCurrentUser.and.returnValue({ id: 'me', name: 'Me', isVerified: true });

    const storyService = jasmine.createSpyObj('StoryService', ['getFeed']);
    storyService.getFeed.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [SwipeComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SearchService, useValue: searchService },
        { provide: UserService, useValue: userService },
        { provide: GeoService, useValue: geoService },
        { provide: BookmarksService, useValue: bookmarksService },
        { provide: SwipeService, useValue: swipeService },
        { provide: MatchService, useValue: matchService },
        { provide: AuthService, useValue: authService },
        { provide: SwipeActionService, useValue: swipeActionService },
        { provide: ShareService, useValue: shareService },
        { provide: ModalService, useValue: modalService },
        { provide: ToastService, useValue: toastService },
        { provide: Router, useValue: router },
        { provide: StoryService, useValue: storyService },
      ],
    }).compileComponents();

    component = TestBed.createComponent(SwipeComponent).componentInstance;
  });

  it('removeCard should remove card from both component and swipe service lists and call skip', () => {
    const cards = setCards([createCard('a'), createCard('b')]);

    component.removeCard(cards[0]);

    expect(component.cards.map((c) => c.user.id)).toEqual(['b']);
    expect(cards.map((c) => c.user.id)).toEqual(['b']);
    expect(swipeActionService.skipUser).toHaveBeenCalledWith('a');
  });

  it('likeProfile should remove card and call like + match check', () => {
    const cards = setCards([createCard('a'), createCard('b')]);

    component.likeProfile(cards[0]);

    expect(component.cards.map((c) => c.user.id)).toEqual(['b']);
    expect(cards.map((c) => c.user.id)).toEqual(['b']);
    expect(swipeActionService.likeUser).toHaveBeenCalledWith('a');
    expect(bookmarksService.addBookmark).not.toHaveBeenCalled();
    expect(matchService.checkMatch).toHaveBeenCalledWith('a');
  });

  it('removeCard should not call skip when card has no user id', () => {
    const cards = setCards([createCard(undefined)]);

    component.removeCard(cards[0]);

    expect(swipeActionService.skipUser).not.toHaveBeenCalled();
  });

  it('displayCards should include only cards with loaded photo', () => {
    const withPhoto = createCard('a');
    withPhoto.photoDataUrl = 'blob:test';
    setCards([withPhoto, createCard('b')]);

    expect(component.displayCards.map((c) => c.user.id)).toEqual(['a']);
  });

  it('showNoCards should be true when not loading and no visible cards', () => {
    setCards([createCard('a')]);
    component.loading = false;

    expect(component.showNoCards).toBeTrue();
  });

  it('showNoCards should be false while loading even without visible cards', () => {
    setCards([createCard('a')]);
    component.loading = true;

    expect(component.showNoCards).toBeFalse();
  });

  it('loadNextPhoto should set photoDataUrl when photo loads successfully', () => {
    const cards = setCards([createCard('0'), createCard('1'), createCard('2')]);
    userService.getPhoto.and.returnValue(of(jpegBytes));
    spyOn(UserService, 'createPhotoUrl').and.returnValue('blob:photo-2');

    component.loadNextPhoto();

    expect(userService.getPhoto).toHaveBeenCalledWith('2', jasmine.any(String));
    expect(cards[2].photoDataUrl).toBe('blob:photo-2');
    expect(component.displayCards.map((c) => c.user.id)).toEqual(['2']);
  });

  it('loadNextPhoto should remove card when API returns placeholder image', () => {
    const cards = setCards([createCard('0'), createCard('1'), createCard('placeholder')]);
    userService.getPhoto.and.returnValue(of(pngPlaceholderBytes));

    component.loadNextPhoto();

    expect(component.cards.map((c) => c.user.id)).toEqual(['0', '1']);
    expect(component.displayCards).toEqual([]);
  });

  it('loadNextPhoto should remove card when photo request fails', () => {
    const cards = setCards([createCard('0'), createCard('1'), createCard('broken')]);
    userService.getPhoto.and.returnValue(throwError(() => new Error('photo failed')));

    component.loadNextPhoto();

    expect(component.cards.map((c) => c.user.id)).toEqual(['0', '1']);
    expect(component.displayCards).toEqual([]);
  });

  it('loadVisiblePhotos should remove cards without real photos and keep cards with JPEG', () => {
    const goodCard = createCard('good');
    const badCard = createCard('bad');
    setCards([goodCard, badCard]);
    userService.getPhoto.and.callFake((userId: string) => {
      if (userId === 'good') {
        return of(jpegBytes);
      }
      return of(pngPlaceholderBytes);
    });
    spyOn(UserService, 'createPhotoUrl').and.returnValue('blob:good-photo');
    const onComplete = jasmine.createSpy('onComplete');

    (component as unknown as { loadVisiblePhotos: (cb?: () => void) => void }).loadVisiblePhotos(onComplete);

    expect(component.cards.map((c) => c.user.id)).toEqual(['good']);
    expect(goodCard.photoDataUrl).toBe('blob:good-photo');
    expect(component.displayCards.map((c) => c.user.id)).toEqual(['good']);
    expect(onComplete).toHaveBeenCalled();
  });

  it('manualSwipe should not swipe when there are no visible cards', () => {
    setCards([createCard('hidden')]);
    component.loading = false;

    component.manualSwipe(SwipeDirection.RIGHT);

    expect(swipeService.swipe).not.toHaveBeenCalled();
  });

  it('manualSwipe should not swipe for unverified user', () => {
    const withPhoto = createCard('a');
    withPhoto.photoDataUrl = 'blob:test';
    setCards([withPhoto]);
    component.isUserVerified = false;

    component.manualSwipe(SwipeDirection.RIGHT);

    expect(swipeService.swipe).not.toHaveBeenCalled();
  });

  it('browse swipe should move to next card without calling swipe service', () => {
    spyOn(window, 'matchMedia').and.returnValue({
      matches: true,
      media: '(max-width: 1024px)',
    } as MediaQueryList);

    const first = createCard('a');
    first.photoDataUrl = 'blob:a';
    const second = createCard('b');
    second.photoDataUrl = 'blob:b';
    setCards([first, second]);
    component.mobileBrowseIndex = 0;

    component.onBrowsePointerDown({
      pointerId: 1,
      button: 0,
      clientX: 200,
      clientY: 100,
      target: document.createElement('div'),
      currentTarget: document.createElement('div'),
    } as unknown as PointerEvent);
    (component as unknown as { browseDeltaX: number }).browseDeltaX = -100;
    component.onBrowsePointerEnd();

    expect(component.mobileBrowseIndex).toBe(1);
    expect(swipeService.swipe).not.toHaveBeenCalled();
  });
});
