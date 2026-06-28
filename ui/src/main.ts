import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

function hideAppLoader(): void {
  const loader = document.getElementById('appLoader');
  if (!loader) {
    return;
  }
  loader.classList.add('hidden');
  window.setTimeout(() => loader.remove(), 500);
}

bootstrapApplication(AppComponent, appConfig)
  .then(() => hideAppLoader())
  .catch((err) => {
    hideAppLoader();
    console.error(err);
  });
