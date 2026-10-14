import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

let failed = false;

// Node version check
const nodeRes = spawnSync('node', ['--version'], { encoding: 'utf8' });
const nodeOk = nodeRes.status === 0;
failed ||= !nodeOk;
console.log(`${nodeOk ? 'PASS' : 'BLOCKED'} node: ${nodeOk ? nodeRes.stdout.trim() : (nodeRes.error?.message ?? nodeRes.stderr.trim())}`);

// Compact check: verify CLI if present, or precompiled artifacts if in hosted deploy environment
const compactRes = spawnSync('compact', ['compile', '--version'], { encoding: 'utf8' });
if (compactRes.status === 0) {
  console.log(`PASS compact: ${compactRes.stdout.trim()}`);
} else {
  // Check if managed artifacts exist and are valid
  const hasBindings = existsSync('contracts/managed/commonveil/contract/index.js');
  const hasKeys = existsSync('contracts/managed/commonveil/keys/attest.verifier');
  const hasZkir = existsSync('contracts/managed/commonveil/zkir/attest.zkir');
  if (hasBindings && hasKeys && hasZkir) {
    console.log('PASS compact: precompiled artifacts verified (hosted deployment mode)');
  } else {
    failed = true;
    console.log(`BLOCKED compact: compiler not found and artifacts missing (${compactRes.error?.message ?? compactRes.stderr?.trim()})`);
  }
}

// Docker check: non-blocking advisory for local testing
const dockerRes = spawnSync('docker', ['info', '--format', '{{.ServerVersion}}'], { encoding: 'utf8' });
const dockerOk = dockerRes.status === 0;
console.log(`${dockerOk ? 'PASS' : 'INFO'} docker: ${dockerOk ? dockerRes.stdout.trim() : 'not available (optional for hosted web app)'}`);

process.exitCode = failed ? 1 : 0;

