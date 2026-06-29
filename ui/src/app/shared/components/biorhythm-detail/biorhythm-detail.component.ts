import { Component, Input, OnInit } from '@angular/core';
import { NgClass, NgStyle, DecimalPipe } from '@angular/common';
import { BIORHYTHM_LABELS } from '../../utils/biorhythm-labels.util';
import { UserService, BiorhythmDetail } from '../../../core/services/user.service';

@Component({
  selector: 'app-biorhythm-detail',
  standalone: true,
  imports: [NgClass, NgStyle, DecimalPipe],
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
          <div class="cycle-item mb-2">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <span class="small text-muted">{{ getLabel(cycle.name) }}</span>
              <span class="small fw-bold" [ngClass]="{
                'text-success': cycle.compatibility >= 0.7,
                'text-warning': cycle.compatibility >= 0.4 && cycle.compatibility < 0.7,
                'text-danger': cycle.compatibility < 0.4
              }">
                {{ (cycle.compatibility * 100).toFixed(0) }}%
              </span>
            </div>
            <div class="progress" style="height: 6px;">
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
            <div class="d-flex justify-content-between mt-1">
              <span class="text-muted" style="font-size: 0.7rem;">{{ cycle.period | number:'1.0-1' }} дн.</span>
              <span class="text-muted" style="font-size: 0.7rem;" title="Ваш биоритм / биоритм партнёра">
                вы {{ (cycle.selfValue > 0 ? '+' : '') + cycle.selfValue.toFixed(2) }} /
                {{ (cycle.otherValue > 0 ? '+' : '') + cycle.otherValue.toFixed(2) }}
              </span>
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
      padding: 4px 0;
    }
    .progress {
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
}
