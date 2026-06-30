import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';

const CANDIDATE_EDGE_PATHS = [
  process.env.EDGE_BIN,
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Microsoft Edge Beta.app/Contents/MacOS/Microsoft Edge Beta',
  '/usr/bin/microsoft-edge',
  '/usr/bin/microsoft-edge-stable',
  '/usr/bin/microsoft-edge-beta',
];

const edgeBin = CANDIDATE_EDGE_PATHS.find((candidate) => candidate && existsSync(candidate));

if (!edgeBin) {
  console.error('Microsoft Edge binary was not found.');
  console.error('Set EDGE_BIN manually and retry, for example:');
  console.error("EDGE_BIN='/path/to/Microsoft Edge' npm run test:edge -- --include='**/swipe.component.spec.ts'");
  process.exit(1);
}

const args = process.argv.slice(2);
const child = spawn(
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['run', 'test', '--', '--watch=false', '--browsers=EdgeHeadless', ...args],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      EDGE_BIN: edgeBin,
    },
  },
);

child.on('exit', (code) => process.exit(code ?? 1));
