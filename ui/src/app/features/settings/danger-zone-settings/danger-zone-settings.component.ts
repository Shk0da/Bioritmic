import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { ModalService } from '../../../core/services/modal.service';
import { PageBackLinkComponent } from '../../../shared/components/page-back-link/page-back-link.component';

@Component({
  selector: 'app-danger-zone-settings',
  standalone: true,
  imports: [PageBackLinkComponent],
  template: `
    <app-page-back-link link="/settings" label="Назад к настройкам"></app-page-back-link>

    <div class="page-header mb-4">
      <h1 class="page-title text-danger">
        <i class="bi bi-exclamation-triangle me-2"></i>Опасная зона
      </h1>
      <p class="text-muted">Необратимые действия с аккаунтом</p>
    </div>

    <div class="row">
      <div class="col-12 col-lg-8 mx-auto">
        <div class="card mb-4 border-danger">
          <div class="card-body">
            <p class="text-muted small mb-3">Удаление аккаунта необратимо. Все ваши данные будут удалены.</p>
            <button type="button" class="btn btn-outline-danger" (click)="deleteAccount()" [disabled]="deletingAccount">
              @if (deletingAccount) {
                <span class="spinner-border spinner-border-sm me-2"></span>
              }
              Удалить аккаунт
            </button>
          </div>
        </div>

      </div>
    </div>
  `
})
export class DangerZoneSettingsComponent {
  deletingAccount = false;

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private router: Router,
    private modalService: ModalService
  ) {}

  async deleteAccount(): Promise<void> {
    const confirmed = await this.modalService.confirm(
      'Вы уверены, что хотите удалить аккаунт? Это действие необратимо.',
      'Удалить аккаунт?'
    );
    if (!confirmed) {
      return;
    }
    this.deletingAccount = true;
    this.userService.deleteUser().subscribe({
      next: () => {
        this.authService.clearAuth();
        this.router.navigate(['/auth/login']);
      },
      error: () => {
        this.deletingAccount = false;
        void this.modalService.alert('Не удалось удалить аккаунт', 'Ошибка');
      }
    });
  }
}
