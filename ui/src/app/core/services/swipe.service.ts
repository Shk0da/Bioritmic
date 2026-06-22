import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { SwipeDirection, SwipeCard, UserInfo } from '../models/user.model';

export interface SwipeResult {
  direction: SwipeDirection;
  card: SwipeCard;
}

@Injectable({
  providedIn: 'root'
})
export class SwipeService {
  private swipeSubject = new Subject<SwipeResult>();
  private undoSubject = new Subject<SwipeCard>();
  private cards: SwipeCard[] = [];
  private currentIndex = 0;
  private history: Array<{ index: number; direction: SwipeDirection; card: SwipeCard }> = [];
  private maxHistory = 10;

  get onSwipe(): Observable<SwipeResult> {
    return this.swipeSubject.asObservable();
  }

  get onUndo(): Observable<SwipeCard> {
    return this.undoSubject.asObservable();
  }

  setCards(users: UserInfo[]): void {
    this.cards = users.map(user => ({
      user,
      photoDataUrl: null,
      isLiked: false,
      isSuperLiked: false
    }));
    this.currentIndex = 0;
    this.history = [];
  }

  getCards(): SwipeCard[] {
    return this.cards;
  }

  getCurrentCard(): SwipeCard | null {
    if (this.currentIndex < this.cards.length) {
      return this.cards[this.currentIndex];
    }
    return null;
  }

  getNextCard(): SwipeCard | null {
    if (this.currentIndex + 1 < this.cards.length) {
      return this.cards[this.currentIndex + 1];
    }
    return null;
  }

  hasMoreCards(): boolean {
    return this.currentIndex < this.cards.length;
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  canUndo(): boolean {
    return this.history.length > 0;
  }

  swipe(direction: SwipeDirection): SwipeCard | null {
    const card = this.getCurrentCard();
    if (!card) return null;

    card.isLiked = direction === SwipeDirection.RIGHT;
    card.isSuperLiked = direction === SwipeDirection.UP;

    this.history.push({ index: this.currentIndex, direction, card });
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    this.swipeSubject.next({ direction, card });
    this.currentIndex++;

    return card;
  }

  undo(): SwipeCard | null {
    if (this.history.length === 0) return null;

    const last = this.history.pop()!;
    this.currentIndex = last.index;

    last.card.isLiked = false;
    last.card.isSuperLiked = false;

    this.undoSubject.next(last.card);
    return last.card;
  }

  reset(): void {
    this.currentIndex = 0;
    this.history = [];
  }

  getLikedCards(): SwipeCard[] {
    return this.cards.filter(card => card.isLiked || card.isSuperLiked);
  }
}
