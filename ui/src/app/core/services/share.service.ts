import { Injectable } from '@angular/core';

export type ShareProfileResult = 'shared' | 'copied' | 'cancelled' | 'failed';

@Injectable({ providedIn: 'root' })
export class ShareService {

  buildProfileUrl(userId: string): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/user/${userId}`;
  }

  canNativeShare(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  }

  async shareProfile(userId: string, userName: string): Promise<ShareProfileResult> {
    const url = this.buildProfileUrl(userId);
    const title = `${userName} — Bioritmic`;
    const text = 'Посмотри мой профиль в Bioritmic';

    if (this.canNativeShare()) {
      try {
        await navigator.share({ title, text, url });
        return 'shared';
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return 'cancelled';
        }
      }
    }

    try {
      await this.copyToClipboard(url);
      return 'copied';
    } catch {
      return 'failed';
    }
  }

  private async copyToClipboard(text: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    if (!copied) {
      throw new Error('Copy failed');
    }
  }
}
