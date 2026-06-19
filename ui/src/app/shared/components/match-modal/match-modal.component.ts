import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-match-modal',
  standalone: true,
  imports: [NgClass],
  template: `
    @if (visible) {
      <div class="match-modal-backdrop" (click)="closed.emit()">
        <div class="match-modal" (click)="$event.stopPropagation()">
          <div class="match-content text-center">
            <div class="match-icon">
              <i class="bi bi-heart-fill"></i>
            </div>
            <h2 class="match-title">Это совпадение!</h2>
            <p class="match-subtitle">Вы и {{ matchedUser?.name }} понравились друг другу</p>

            <div class="match-photos">
              @if (currentUserPhoto) {
                <img [src]="currentUserPhoto" class="match-avatar" alt="You">
              }
              <div class="match-heart-badge">
                <i class="bi bi-heart-fill"></i>
              </div>
              @if (matchedUserPhoto) {
                <img [src]="matchedUserPhoto" class="match-avatar" alt="{{ matchedUser?.name }}">
              }
            </div>

            <div class="match-actions">
              <button class="btn btn-outline-light btn-lg" (click)="closed.emit()">
                Продолжить
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .match-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 2000;
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .match-modal {
      background: linear-gradient(135deg, #fd297b 0%, #ff5864 100%);
      border-radius: 24px;
      padding: 2.5rem;
      max-width: 380px;
      width: 90%;
      animation: scaleIn 0.3s ease;
    }

    @keyframes scaleIn {
      from { transform: scale(0.8); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    .match-icon {
      font-size: 4rem;
      color: white;
      margin-bottom: 1rem;
      animation: pulse 1.5s ease infinite;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.2); }
    }

    .match-title {
      color: white;
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }

    .match-subtitle {
      color: rgba(255, 255, 255, 0.9);
      font-size: 1rem;
      margin-bottom: 2rem;
    }

    .match-photos {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      margin-bottom: 2rem;
    }

    .match-avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      object-fit: cover;
      border: 3px solid white;
    }

    .match-heart-badge {
      width: 40px;
      height: 40px;
      background: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fd297b;
      font-size: 1.2rem;
    }

    .match-actions .btn {
      border-radius: 25px;
      padding: 0.75rem 2rem;
      font-weight: 600;
    }
  `]
})
export class MatchModalComponent {
  @Input() visible = false;
  @Input() matchedUser: any = null;
  @Input() matchedUserPhoto: string | null = null;
  @Input() currentUserPhoto: string | null = null;
  @Output() closed = new EventEmitter<void>();
}
