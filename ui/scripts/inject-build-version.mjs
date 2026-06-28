import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const templatePath = join(rootDir, 'src/index.template.html');
const indexPath = join(rootDir, 'src/index.html');
const placeholder = '__BUILD_VERSION__';

function formatBuildVersion(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join('');
}

const version = formatBuildVersion();
const template = readFileSync(templatePath, 'utf8');

if (!template.includes(placeholder)) {
  throw new Error(`Placeholder ${placeholder} not found in index.template.html`);
}

writeFileSync(indexPath, template.replaceAll(placeholder, version));
console.log(`[inject-build-version] ${version}`);
