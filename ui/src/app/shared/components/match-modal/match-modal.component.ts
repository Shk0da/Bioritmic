import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { NgClass, NgFor } from '@angular/common';
import { RouterLink } from '@angular/router';

interface Confetti {
  x: number;
  y: number;
  color: string;
  size: number;
  speedX: number;
  speedY: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
}

@Component({
  selector: 'app-match-modal',
  standalone: true,
  imports: [NgClass, NgFor, RouterLink],
  template: `
    @if (visible) {
      <div class="match-modal-backdrop" (click)="closed.emit()">
        <div class="match-modal" (click)="$event.stopPropagation()">
          <!-- Confetti -->
          <div class="confetti-container">
            @for (c of confettiPieces; track $index) {
              <div class="confetti-piece"
                [style.left]="c.x + 'px'"
                [style.top]="c.y + 'px'"
                [style.width]="c.size + 'px'"
                [style.height]="c.size + 'px'"
                [style.background]="c.color"
                [style.opacity]="c.opacity"
                [style.transform]="'rotate(' + c.rotation + 'deg)'">
              </div>
            }
          </div>

          <div class="match-content text-center">
            <div class="match-hearts">
              <i class="bi bi-heart-fill heart-left"></i>
              <i class="bi bi-heart-fill heart-center"></i>
              <i class="bi bi-heart-fill heart-right"></i>
            </div>
            <h2 class="match-title">Это совпадение!</h2>
            <p class="match-subtitle">Вы и <strong>{{ matchedUser?.name }}</strong> понравились друг другу</p>

            <div class="match-photos">
              @if (currentUserPhoto) {
                <div class="photo-ring">
                  <img [src]="currentUserPhoto" class="match-avatar" alt="You">
                </div>
              }
              <div class="match-heart-badge">
                <i class="bi bi-heart-fill"></i>
              </div>
              @if (matchedUserPhoto) {
                <div class="photo-ring">
                  <img [src]="matchedUserPhoto" class="match-avatar" [alt]="matchedUser?.name">
                </div>
              }
            </div>

            <div class="match-actions">
              <a [routerLink]="['/mailbox', 'conversation', matchedUser?.id]" class="btn btn-match-message" (click)="closed.emit()">
                <i class="bi bi-chat-dots-fill me-2"></i>Написать сообщение
              </a>
              <button class="btn btn-match-continue" (click)="closed.emit()">
                Продолжить поиск
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
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 2000;
      animation: fadeIn 0.3s ease;
      backdrop-filter: blur(8px);
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .match-modal {
      background: linear-gradient(135deg, #fd297b 0%, #ff5864 50%, #ff655b 100%);
      border-radius: 28px;
      padding: 2.5rem;
      max-width: 400px;
      width: 90%;
      animation: scaleIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      position: relative;
      overflow: hidden;
    }

    @keyframes scaleIn {
      from { transform: scale(0.5) rotate(-5deg); opacity: 0; }
      to { transform: scale(1) rotate(0deg); opacity: 1; }
    }

    /* Confetti */
    .confetti-container {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
    }

    .confetti-piece {
      position: absolute;
      border-radius: 2px;
      animation: confettiFall 3s ease-out forwards;
    }

    @keyframes confettiFall {
      0% {
        transform: translateY(-20px) rotate(0deg);
        opacity: 1;
      }
      100% {
        transform: translateY(500px) rotate(720deg);
        opacity: 0;
      }
    }

    .match-hearts {
      display: flex;
      justify-content: center;
      gap: 0.5rem;
      margin-bottom: 1rem;
      position: relative;

      i {
        color: white;
      }

      .heart-left {
        font-size: 1.5rem;
        animation: heartBeat 1.2s ease infinite;
        animation-delay: 0s;
        opacity: 0.7;
      }

      .heart-center {
        font-size: 3rem;
        animation: heartPulse 1.5s ease infinite;
        filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3));
      }

      .heart-right {
        font-size: 1.5rem;
        animation: heartBeat 1.2s ease infinite;
        animation-delay: 0.3s;
        opacity: 0.7;
      }
    }

    @keyframes heartBeat {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.3); }
    }

    @keyframes heartPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.15); }
    }

    .match-title {
      color: white;
      font-size: 2rem;
      font-weight: 800;
      margin-bottom: 0.5rem;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    .match-subtitle {
      color: rgba(255, 255, 255, 0.95);
      font-size: 1rem;
      margin-bottom: 2rem;

      strong {
        color: white;
      }
    }

    .match-photos {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      margin-bottom: 2rem;
    }

    .photo-ring {
      padding: 3px;
      background: rgba(255, 255, 255, 0.5);
      border-radius: 50%;
      animation: ringPulse 2s ease infinite;
    }

    @keyframes ringPulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4); }
      50% { box-shadow: 0 0 0 8px rgba(255, 255, 255, 0); }
    }

    .match-avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      object-fit: cover;
      border: 3px solid white;
    }

    .match-heart-badge {
      width: 44px;
      height: 44px;
      background: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ff2d55 !important;
      font-size: 1.3rem;
      animation: badgePulse 1.5s ease infinite;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);

      i {
        color: #ff2d55 !important;
      }
    }

    @keyframes badgePulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }

    .match-actions {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .btn-match-message {
      background: white;
      color: #111827 !important;
      border: none;
      border-radius: 25px;
      padding: 0.85rem 1.5rem;
      font-weight: 700;
      font-size: 1rem;
      text-decoration: none;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);

      i {
        color: #111827 !important;
      }

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        color: #111827 !important;

        i {
          color: #111827 !important;
        }
      }
    }

    .btn-match-continue {
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(4px);
      color: rgba(255, 255, 255, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 25px;
      padding: 0.75rem 1.5rem;
      font-weight: 600;
      font-size: 0.9rem;
      transition: all 0.3s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.25);
        color: white;
      }
    }
  `]
})
export class MatchModalComponent implements OnInit, OnDestroy {
  @Input() visible = false;
  @Input() matchedUser: any = null;
  @Input() matchedUserPhoto: string | null = null;
  @Input() currentUserPhoto: string | null = null;
  @Output() closed = new EventEmitter<void>();

  confettiPieces: Confetti[] = [];
  private animationId: number | null = null;

  ngOnInit(): void {
    if (this.visible) {
      this.startConfetti();
    }
  }

  ngOnDestroy(): void {
    this.stopConfetti();
  }

  private startConfetti(): void {
    const colors = ['#fd297b', '#ff655b', '#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#a78bfa', '#fb923c'];
    this.confettiPieces = Array.from({ length: 50 }, () => ({
      x: Math.random() * 400,
      y: Math.random() * -100,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 10 + 4,
      speedX: (Math.random() - 0.5) * 4,
      speedY: Math.random() * 3 + 2,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      opacity: 1
    }));
  }

  private stopConfetti(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}
