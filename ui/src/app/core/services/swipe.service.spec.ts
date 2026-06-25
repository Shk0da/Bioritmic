import { SwipeService, SwipeResult } from './swipe.service';
import { SwipeDirection, SwipeCard, UserInfo } from '../models/user.model';

describe('SwipeService', () => {
  let service: SwipeService;
  const mockUsers: UserInfo[] = [
    { id: '1', name: 'Alice', email: 'a@test.com', birthday: '1990-01-01', gender: 'WOMAN' as any },
    { id: '2', name: 'Bob', email: 'b@test.com', birthday: '1988-05-05', gender: 'MAN' as any },
    { id: '3', name: 'Charlie', email: 'c@test.com', birthday: '1995-09-09', gender: 'MAN' as any }
  ];

  beforeEach(() => {
    service = new SwipeService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('setCards', () => {
    it('should set cards from users', () => {
      service.setCards(mockUsers);
      expect(service.getCards().length).toBe(3);
    });

    it('should reset index and history', () => {
      service.setCards(mockUsers);
      service.swipe(SwipeDirection.RIGHT);
      service.setCards(mockUsers);
      expect(service.getCurrentIndex()).toBe(0);
      expect(service.canUndo()).toBeFalse();
    });
  });

  describe('getCurrentCard', () => {
    it('should return first card initially', () => {
      service.setCards(mockUsers);
      const card = service.getCurrentCard();
      expect(card?.user.name).toBe('Alice');
    });

    it('should return null when no more cards', () => {
      service.setCards([]);
      expect(service.getCurrentCard()).toBeNull();
    });
  });

  describe('getNextCard', () => {
    it('should return next card', () => {
      service.setCards(mockUsers);
      const next = service.getNextCard();
      expect(next?.user.name).toBe('Bob');
    });

    it('should return null at last card', () => {
      service.setCards([mockUsers[0]]);
      expect(service.getNextCard()).toBeNull();
    });
  });

  describe('hasMoreCards', () => {
    it('should return true when cards remain', () => {
      service.setCards(mockUsers);
      expect(service.hasMoreCards()).toBeTrue();
    });

    it('should return false when no cards', () => {
      service.setCards([]);
      expect(service.hasMoreCards()).toBeFalse();
    });
  });

  describe('swipe', () => {
    it('should advance index on swipe', () => {
      service.setCards(mockUsers);
      service.swipe(SwipeDirection.RIGHT);
      expect(service.getCurrentIndex()).toBe(1);
    });

    it('should set isLiked on RIGHT swipe', () => {
      service.setCards(mockUsers);
      const card = service.swipe(SwipeDirection.RIGHT);
      expect(card?.isLiked).toBeTrue();
    });

    it('should set isSuperLiked on UP swipe', () => {
      service.setCards(mockUsers);
      const card = service.swipe(SwipeDirection.UP);
      expect(card?.isSuperLiked).toBeTrue();
    });

    it('should not set isLiked on LEFT swipe', () => {
      service.setCards(mockUsers);
      const card = service.swipe(SwipeDirection.LEFT);
      expect(card?.isLiked).toBeFalse();
      expect(card?.isSuperLiked).toBeFalse();
    });

    it('should return null when no cards', () => {
      service.setCards([]);
      expect(service.swipe(SwipeDirection.RIGHT)).toBeNull();
    });

    it('should emit swipe result', (done) => {
      service.setCards(mockUsers);
      service.onSwipe.subscribe((result: SwipeResult) => {
        expect(result.direction).toBe(SwipeDirection.RIGHT);
        expect(result.card.user.name).toBe('Alice');
        done();
      });
      service.swipe(SwipeDirection.RIGHT);
    });

    it('should add to history', () => {
      service.setCards(mockUsers);
      service.swipe(SwipeDirection.RIGHT);
      expect(service.canUndo()).toBeTrue();
    });

    it('should cap history at maxHistory', () => {
      const manyUsers: UserInfo[] = Array.from({ length: 15 }, (_, i) => ({
        id: String(i), name: `U${i}`, email: `u${i}@t.com`, birthday: '1990-01-01', gender: 'MAN' as any
      }));
      service.setCards(manyUsers);
      for (let i = 0; i < 15; i++) {
        service.swipe(SwipeDirection.LEFT);
      }
      expect(service['history'].length).toBe(10);
    });
  });

  describe('undo', () => {
    it('should restore previous card', () => {
      service.setCards(mockUsers);
      service.swipe(SwipeDirection.RIGHT);
      service.undo();
      expect(service.getCurrentIndex()).toBe(0);
      expect(service.getCurrentCard()?.user.name).toBe('Alice');
    });

    it('should reset flags on undo', () => {
      service.setCards(mockUsers);
      service.swipe(SwipeDirection.RIGHT);
      service.undo();
      const card = service.getCurrentCard();
      expect(card?.isLiked).toBeFalse();
      expect(card?.isSuperLiked).toBeFalse();
    });

    it('should return null when nothing to undo', () => {
      service.setCards(mockUsers);
      expect(service.undo()).toBeNull();
    });

    it('should emit undo event', (done) => {
      service.setCards(mockUsers);
      service.swipe(SwipeDirection.RIGHT);
      service.onUndo.subscribe(card => {
        expect(card.user.name).toBe('Alice');
        done();
      });
      service.undo();
    });
  });

  describe('canUndo', () => {
    it('should return false initially', () => {
      service.setCards(mockUsers);
      expect(service.canUndo()).toBeFalse();
    });

    it('should return true after swipe', () => {
      service.setCards(mockUsers);
      service.swipe(SwipeDirection.RIGHT);
      expect(service.canUndo()).toBeTrue();
    });
  });

  describe('getLikedCards', () => {
    it('should return liked and superliked cards', () => {
      service.setCards(mockUsers);
      service.swipe(SwipeDirection.RIGHT);
      service.swipe(SwipeDirection.LEFT);
      service.swipe(SwipeDirection.UP);
      const liked = service.getLikedCards();
      expect(liked.length).toBe(2);
    });
  });

  describe('reset', () => {
    it('should reset index and history', () => {
      service.setCards(mockUsers);
      service.swipe(SwipeDirection.RIGHT);
      service.swipe(SwipeDirection.RIGHT);
      service.reset();
      expect(service.getCurrentIndex()).toBe(0);
      expect(service.canUndo()).toBeFalse();
    });
  });
});
