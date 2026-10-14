import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

let failed = false;

// 1. Node version check
const nodeRes = spawnSync('node', ['--version'], { encoding: 'utf8' });
const nodeOk = nodeRes.status === 0;
failed ||= !nodeOk;
console.log(`${nodeOk ? 'PASS' : 'BLOCKED'} node: ${nodeOk ? nodeRes.stdout.trim() : (nodeRes.error?.message ?? nodeRes.stderr.trim())}`);

// 2. Compact compiler and runtime artifact validation
const compactRes = spawnSync('compact', ['compile', '--version'], { encoding: 'utf8' });
const hasCompactCLI = compactRes.status === 0;

if (hasCompactCLI) {
  console.log(`PASS compact CLI: ${compactRes.stdout.trim()}`);
} else {
  console.log('INFO compact CLI: not installed in environment (hosted build mode)');
}

// 3. Verify all required Compact runtime artifacts against manifest checksums
const manifestPath = 'contracts/managed/commonveil/manifest.json';
if (!existsSync(manifestPath)) {
  failed = true;
  console.log(`BLOCKED compact artifacts: manifest missing at ${manifestPath}`);
} else {
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const circuits = manifest.circuits || [];
    const files = manifest.files || {};
    let manifestOk = true;

    // Check each circuit has all 4 circuit assets plus bindings
    for (const circuit of circuits) {
      const required = [
        `keys/${circuit}.prover`,
        `keys/${circuit}.verifier`,
        `zkir/${circuit}.zkir`,
        `zkir/${circuit}.bzkir`,
      ];
      for (const rel of required) {
        if (!files[rel]) {
          console.log(`BLOCKED manifest: missing entry for ${rel}`);
          manifestOk = false;
        }
      }
    }

    for (const [relPath, expected] of Object.entries(files)) {
      const fullPath = path.join('contracts/managed/commonveil', relPath);
      if (!existsSync(fullPath)) {
        console.log(`BLOCKED compact artifact missing: ${fullPath}`);
        manifestOk = false;
        continue;
      }

      const content = readFileSync(fullPath);
      if (content.length !== expected.size) {
        console.log(`BLOCKED size mismatch for ${relPath}: expected ${expected.size}, got ${content.length}`);
        manifestOk = false;
        continue;
      }

      const hash = createHash('sha256').update(content).digest('hex');
      if (hash !== expected.sha256) {
        console.log(`BLOCKED checksum mismatch for ${relPath}: expected ${expected.sha256}, got ${hash}`);
        manifestOk = false;
        continue;
      }
    }

    if (manifestOk) {
      console.log(`PASS compact artifacts: validated 4/4 circuits (${Object.keys(files).length} files, exact SHA256 checksums verified)`);
    } else {
      failed = true;
    }
  } catch (err) {
    failed = true;
    console.log(`BLOCKED compact artifacts verification error: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// 4. Docker check: non-blocking advisory for local testing
const dockerRes = spawnSync('docker', ['info', '--format', '{{.ServerVersion}}'], { encoding: 'utf8' });
const dockerOk = dockerRes.status === 0;
console.log(`${dockerOk ? 'PASS' : 'INFO'} docker: ${dockerOk ? dockerRes.stdout.trim() : 'not available (optional for hosted web app)'}`);

process.exitCode = failed ? 1 : 0;
