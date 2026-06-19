import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { UserService } from '../../../core/services/user.service';

interface Prompt {
  id?: number;
  text?: string;
  category?: string;
}

interface PromptAnswer {
  promptId?: number;
  answer?: string;
}

@Component({
  selector: 'app-prompt-answer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="prompt-answer-container">
      <div class="prompt-header">
        <h5>Ответьте на промпты</h5>
        <p class="text-muted small">Помогите другим узнать вас лучше</p>
      </div>

      @if (loading) {
        <div class="text-center py-3">
          <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
        </div>
      } @else {
        @for (prompt of prompts; track prompt.id) {
          <div class="prompt-card">
            <div class="prompt-text">{{ prompt.text }}</div>
            <textarea
              class="prompt-input"
              [(ngModel)]="answers[prompt.id!]"
              placeholder="Ваш ответ..."
              rows="2"
              maxlength="300"
            ></textarea>
            <div class="prompt-footer">
              <span class="char-count">{{ (answers[prompt.id!] || '').length }}/300</span>
            </div>
          </div>
        }

        <div class="prompt-actions">
          <button class="btn btn-secondary" (click)="loadPrompts()">Обновить промпты</button>
          <button class="btn btn-primary" (click)="saveAnswers()" [disabled]="saving">
            @if (saving) {
              <span class="spinner-border spinner-border-sm" role="status"></span>
            }
            Сохранить
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .prompt-answer-container {
      padding: 16px;
    }

    .prompt-header {
      margin-bottom: 20px;
    }

    .prompt-header h5 {
      margin: 0;
      font-weight: 600;
    }

    .prompt-card {
      background: #f9fafb;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 12px;
    }

    .prompt-text {
      font-weight: 500;
      margin-bottom: 10px;
      color: #374151;
    }

    .prompt-input {
      width: 100%;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 14px;
      resize: none;
      background: white;
    }

    .prompt-input:focus {
      outline: none;
      border-color: #ec4899;
      box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.1);
    }

    .prompt-footer {
      display: flex;
      justify-content: flex-end;
      margin-top: 6px;
    }

    .char-count {
      font-size: 12px;
      color: #9ca3af;
    }

    .prompt-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
    }
  `]
})
export class PromptAnswerComponent implements OnInit, OnDestroy {
  @Output() saved = new EventEmitter<void>();

  prompts: Prompt[] = [];
  answers: Record<number, string> = {};
  loading = false;
  saving = false;

  private destroy$ = new Subject<void>();

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadPrompts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPrompts(): void {
    this.loading = true;
    this.userService.getRandomPrompts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (prompts) => {
          this.prompts = prompts;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
  }

  saveAnswers(): void {
    this.saving = true;
    const answerPromises = Object.entries(this.answers)
      .filter(([_, answer]) => answer.trim())
      .map(([promptId, answer]) =>
        this.userService.savePromptAnswer(parseInt(promptId), answer.trim()).toPromise()
      );

    Promise.all(answerPromises)
      .then(() => {
        this.saving = false;
        this.saved.emit();
      })
      .catch(() => {
        this.saving = false;
      });
  }
}
