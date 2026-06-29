import { Component, Input, OnInit } from '@angular/core';
import { NgClass, NgStyle } from '@angular/common';
import {
  BIORHYTHM_LABELS,
  getBiorhythmDescription,
  getCompatibilityLevelLabel,
} from '../../utils/biorhythm-labels.util';
import { UserService, BiorhythmDetail } from '../../../core/services/user.service';

@Component({
  selector: 'app-biorhythm-detail',
  standalone: true,
  imports: [NgClass, NgStyle],
  template: `
    @if (loading) {
      <div class="text-center py-3">
        <div class="spinner-border spinner-border-sm text-primary" role="status">
          <span class="visually-hidden">Загрузка...</span>
        </div>
      </div>
    } @else if (hasDetail) {
      <div class="biorhythm-detail">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h6 class="mb-0 text-muted">Детальная совместимость</h6>
          <span class="badge" [ngClass]="{
            'bg-success': $any(detail).overallCompatibility >= 0.7,
            'bg-warning': $any(detail).overallCompatibility >= 0.4 && $any(detail).overallCompatibility < 0.7,
            'bg-danger': $any(detail).overallCompatibility < 0.4
          }" title="Среднее по 8 биоритмическим циклам">
            {{ ($any(detail).overallCompatibility * 100).toFixed(0) }}%
          </span>
        </div>

        @for (cycle of $any(detail).cycles; track cycle.name) {
          <div class="cycle-item">
            <div class="cycle-title">{{ getLabel(cycle.name) }}</div>
            @if (getDescription(cycle.name)) {
              <div class="cycle-description">{{ getDescription(cycle.name) }}</div>
            }
            <div class="d-flex justify-content-between align-items-center cycle-stats">
              <span class="cycle-percent fw-bold" [ngClass]="{
                'text-success': cycle.compatibility >= 0.7,
                'text-warning': cycle.compatibility >= 0.4 && cycle.compatibility < 0.7,
                'text-danger': cycle.compatibility < 0.4
              }">
                {{ (cycle.compatibility * 100).toFixed(0) }}%
              </span>
              <span class="cycle-level" [ngClass]="{
                'text-success': cycle.compatibility >= 0.7,
                'text-warning': cycle.compatibility >= 0.4 && cycle.compatibility < 0.7,
                'text-danger': cycle.compatibility < 0.4
              }">
                {{ getLevelLabel(cycle.compatibility * 100) }}
              </span>
            </div>
            <div class="progress cycle-progress">
              <div
                class="progress-bar"
                [ngClass]="{
                  'bg-success': cycle.compatibility >= 0.7,
                  'bg-warning': cycle.compatibility >= 0.4 && cycle.compatibility < 0.7,
                  'bg-danger': cycle.compatibility < 0.4
                }"
                [ngStyle]="{ 'width.%': cycle.compatibility * 100 }">
              </div>
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .biorhythm-detail {
      padding: 8px 0;
    }

    .cycle-item {
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--border-light, #f3f4f6);
    }

    .cycle-item:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    .cycle-title {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text-primary, #1f2937);
    }

    .cycle-description {
      font-size: 0.8rem;
      color: var(--text-muted, #6b7280);
      margin-top: 0.15rem;
      line-height: 1.35;
    }

    .cycle-stats {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-top: 0.45rem;
      margin-bottom: 0.35rem;
    }

    .cycle-percent {
      font-size: 1rem;
    }

    .cycle-level {
      font-size: 0.85rem;
      font-weight: 600;
    }

    .cycle-progress {
      height: 6px;
      background-color: var(--border-color, #e9ecef);
    }
  `]
})
export class BiorhythmDetailComponent implements OnInit {
  @Input() userId!: string;

  detail: BiorhythmDetail | null = null;
  loading = false;
  hasDetail = false;

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    if (this.userId) {
      this.loading = true;
      this.userService.getBiorhythmDetail(this.userId).subscribe({
        next: (detail) => {
          this.detail = detail;
          this.hasDetail = true;
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading biorhythm detail:', err);
          this.loading = false;
        }
      });
    }
  }

  getLabel(name: string): string {
    return BIORHYTHM_LABELS[name] || name;
  }

  getDescription(name: string): string {
    return getBiorhythmDescription(name);
  }

  getLevelLabel(percent: number): string {
    return getCompatibilityLevelLabel(percent);
  }
}
