import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { UserService } from '../../../core/services/user.service';
import { Interest } from '../../../core/models/user.model';

@Component({
  selector: 'app-interest-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="interest-picker">
      <div class="picker-header">
        <h5>Выберите ваши интересы</h5>
        <span class="selected-count">{{ selectedIds.size }} выбрано</span>
      </div>

      @for (category of categories; track category) {
        <div class="category-section">
          <h6 class="category-title">{{ category }}</h6>
          <div class="interests-grid">
            @for (interest of getInterestsByCategory(category); track interest.id) {
              <button
                class="interest-chip"
                [class.selected]="isSelected(interest.id!)"
                (click)="toggleInterest(interest.id!)">
                <i class="bi" [ngClass]="interest.icon || 'bi-tag'"></i>
                <span>{{ interest.name }}</span>
              </button>
            }
          </div>
        </div>
      }

      <div class="picker-actions">
        <button class="btn btn-secondary" (click)="reset()">Сбросить</button>
        <button class="btn btn-primary" (click)="save()" [disabled]="saving">
          @if (saving) {
            <span class="spinner-border spinner-border-sm" role="status"></span>
          }
          Сохранить
        </button>
      </div>
    </div>
  `,
  styles: [`
    .interest-picker {
      padding: 16px;
    }

    .picker-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .picker-header h5 {
      margin: 0;
      font-weight: 600;
    }

    .selected-count {
      font-size: 14px;
      color: var(--text-secondary, #6b7280);
    }

    .category-section {
      margin-bottom: 20px;
    }

    .category-title {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-primary, #374151);
      margin-bottom: 10px;
      text-transform: capitalize;
    }

    .interests-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .interest-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 20px;
      border: 1px solid var(--border-color, #e5e7eb);
      background: var(--card-bg, white);
      color: var(--text-primary);
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .interest-chip:hover {
      border-color: var(--accent-pink, #ec4899);
      background: var(--bg-hover, #fdf2f8);
    }

    .interest-chip.selected {
      background: #ec4899;
      border-color: #ec4899;
      color: white;
    }

    .interest-chip i {
      font-size: 14px;
    }

    .picker-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid var(--border-color, #e5e7eb);
    }
  `]
})
export class InterestPickerComponent implements OnInit, OnDestroy {
  @Input() initialSelectedIds: number[] = [];
  @Output() saved = new EventEmitter<number[]>();
  @Output() cancelled = new EventEmitter<void>();

  allInterests: Interest[] = [];
  selectedIds: Set<number> = new Set();
  categories: string[] = [];
  saving = false;

  private destroy$ = new Subject<void>();

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.selectedIds = new Set(this.initialSelectedIds);
    this.loadInterests();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadInterests(): void {
    this.userService.getAllInterests()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (interests) => {
          this.allInterests = interests;
          this.categories = [...new Set(interests.map(i => i.category || ''))].filter(Boolean);
        }
      });
  }

  getInterestsByCategory(category: string): Interest[] {
    return this.allInterests.filter(i => i.category === category);
  }

  isSelected(interestId: number): boolean {
    return this.selectedIds.has(interestId);
  }

  toggleInterest(interestId: number): void {
    if (this.selectedIds.has(interestId)) {
      this.selectedIds.delete(interestId);
    } else {
      this.selectedIds.add(interestId);
    }
  }

  reset(): void {
    this.selectedIds = new Set(this.initialSelectedIds);
  }

  save(): void {
    this.saving = true;
    const ids = Array.from(this.selectedIds);
    this.userService.setUserInterests(ids)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.saving = false;
          this.saved.emit(ids);
        },
        error: () => {
          this.saving = false;
        }
      });
  }
}
