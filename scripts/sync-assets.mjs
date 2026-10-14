import { cpSync, mkdirSync, existsSync, readdirSync, unlinkSync } from 'node:fs';
import path from 'node:path';

const circuits = ['attest', 'certifyInventory', 'registerAffectedRelease', 'registerMember'];
const base = 'contracts/managed/commonveil';

function syncTo(targetDir) {
  const keysDir = path.join(targetDir, 'keys');
  const zkirDir = path.join(targetDir, 'zkir');
  mkdirSync(keysDir, { recursive: true });
  mkdirSync(zkirDir, { recursive: true });

  // 1. Clean any stale non-binary .zkir text files in destination
  if (existsSync(zkirDir)) {
    for (const f of readdirSync(zkirDir)) {
      if (f.endsWith('.zkir')) {
        unlinkSync(path.join(zkirDir, f));
      }
    }
  }

  // 2. Copy and assert all required binary files exist for all 4 circuits
  for (const c of circuits) {
    // Prover key (.prover)
    const proverSrc = path.join(base, 'keys', `${c}.prover`);
    if (!existsSync(proverSrc)) {
      throw new Error(`Asset sync failure: missing required prover key: ${proverSrc}`);
    }
    cpSync(proverSrc, path.join(keysDir, `${c}.prover`));

    // Verifier key (.verifier)
    const verifierSrc = path.join(base, 'keys', `${c}.verifier`);
    if (!existsSync(verifierSrc)) {
      throw new Error(`Asset sync failure: missing required verifier key: ${verifierSrc}`);
    }
    cpSync(verifierSrc, path.join(keysDir, `${c}.verifier`));

    // Binary ZKIR (.bzkir)
    const bzkirSrc = path.join(base, 'zkir', `${c}.bzkir`);
    if (!existsSync(bzkirSrc)) {
      throw new Error(`Asset sync failure: missing required binary ZKIR: ${bzkirSrc}`);
    }
    cpSync(bzkirSrc, path.join(zkirDir, `${c}.bzkir`));
  }
}

const target = process.argv[2] || 'public';
syncTo(target);
console.log(`Assets synchronized to ${target}`);
