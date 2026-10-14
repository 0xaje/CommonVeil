import { cpSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const circuits = ['attest', 'certifyInventory', 'registerAffectedRelease', 'registerMember'];
const base = 'contracts/managed/commonveil';

function syncTo(targetDir) {
  const keysDir = path.join(targetDir, 'keys');
  const zkirDir = path.join(targetDir, 'zkir');
  mkdirSync(keysDir, { recursive: true });
  mkdirSync(zkirDir, { recursive: true });

  for (const c of circuits) {
    // Prover key (.prover)
    const proverSrc = path.join(base, 'keys', `${c}.prover`);
    if (existsSync(proverSrc)) {
      cpSync(proverSrc, path.join(keysDir, `${c}.prover`));
    }
    // Verifier key (.verifier)
    const verifierSrc = path.join(base, 'keys', `${c}.verifier`);
    if (existsSync(verifierSrc)) {
      cpSync(verifierSrc, path.join(keysDir, `${c}.verifier`));
    }
    // Binary ZKIR (.bzkir)
    const bzkirSrc = path.join(base, 'zkir', `${c}.bzkir`);
    if (existsSync(bzkirSrc)) {
      cpSync(bzkirSrc, path.join(zkirDir, `${c}.bzkir`));
    }
  }
}

const target = process.argv[2] || 'public';
syncTo(target);
console.log(`Assets synchronized to ${target}`);
