import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { hostname, platform, release } from 'node:os';

export const PRODUCT_PURL = 'pkg:generic/xz-utils';

const commands = [
  { source: 'dpkg-query', file: 'dpkg-query', args: ['-W', '-f=${Status}\t${Version}\n', 'xz-utils'], parse(output) { return /^install ok installed\t([^\s]+)$/m.exec(output.trim())?.[1]; } },
  { source: 'rpm', file: 'rpm', args: ['-q', '--qf', '%{VERSION}-%{RELEASE}\n', 'xz'], parse(output) { const value = output.trim(); return value && !value.includes('not installed') ? value : undefined; } },
  { source: 'xz-binary', file: 'xz', args: ['--version'], parse(output) { return /^xz \(XZ Utils\) ([^\s]+)$/m.exec(output)?.[1]; } },
];

export function normalizeVersion(rawVersion) {
  const withoutEpoch = rawVersion.replace(/^\d+:/, '').trim();
  const reverted = /\+really(\d+\.\d+\.\d+)/.exec(withoutEpoch);
  const upstream = reverted?.[1] ?? withoutEpoch.split(/[+-]/, 1)[0];
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(upstream);
  if (!match) return undefined;
  return {
    raw: rawVersion,
    normalized: upstream,
    ...(reverted ? { packagingNote: 'effective version taken from Debian +really marker' } : {}),
    major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]),
  };
}

export function scanInventory(run = execFileSync) {
  const attempts = [];
  for (const command of commands) {
    try {
      const output = String(run(command.file, command.args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 5_000 }));
      const rawVersion = command.parse(output);
      if (!rawVersion) { attempts.push({ source: command.source, outcome: 'not-found' }); continue; }
      const version = normalizeVersion(rawVersion);
      if (!version) { attempts.push({ source: command.source, outcome: 'unparseable-version', rawVersion }); continue; }
      return { source: command.source, version, attempts };
    } catch (error) {
      attempts.push({ source: command.source, outcome: error?.code === 'ENOENT' ? 'command-unavailable' : 'not-found' });
    }
  }
  return { attempts };
}

export function buildReport(scan, now = new Date()) {
  const hostFingerprint = createHash('sha256').update(hostname()).digest('hex');
  const base = {
    schema: 'commonveil.inventory/v1', provenance: 'live-host-scan', observedAt: now.toISOString(),
    host: { fingerprint: hostFingerprint, platform: platform(), release: release() }, product: PRODUCT_PURL,
  };
  if (!scan.version) return { ...base, status: 'not-detected', attempts: scan.attempts };
  const measurement = `${PRODUCT_PURL}@${scan.version.normalized}`;
  const exactPolicyMatch = scan.version.major === 5 && scan.version.minor === 6 && [0, 1].includes(scan.version.patch);
  return {
    ...base, status: 'detected', source: scan.source, version: scan.version,
    policyAssessment: {
      advisory: 'CVE-2024-3094',
      exactRegisteredSet: ['5.6.0', '5.6.1'],
      result: exactPolicyMatch ? 'matches-exact-set' : 'outside-exact-set',
    },
    measurementDigest: createHash('sha256').update(measurement).digest('hex'), attempts: scan.attempts,
  };
}
