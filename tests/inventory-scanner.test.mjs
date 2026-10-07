import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReport, normalizeVersion, scanInventory } from '../scripts/inventory-scanner.mjs';

test('normalizes a Debian package version without changing the observed value', () => {
  assert.deepEqual(normalizeVersion('5.6.1-1ubuntu0.1'), { raw: '5.6.1-1ubuntu0.1', normalized: '5.6.1', major: 5, minor: 6, patch: 1 });
});

test('uses the effective version from a Debian +really rollback marker', () => {
  assert.deepEqual(normalizeVersion('5.6.1+really5.4.5-1ubuntu0.2'), {
    raw: '5.6.1+really5.4.5-1ubuntu0.2', normalized: '5.4.5',
    packagingNote: 'effective version taken from Debian +really marker', major: 5, minor: 4, patch: 5,
  });
});

test('reports a detected host package with explicit live provenance', () => {
  const run = (file) => {
    if (file === 'dpkg-query') return 'install ok installed\t5.6.1-1ubuntu0.1\n';
    throw Object.assign(new Error('unexpected command'), { code: 'ENOENT' });
  };
  const report = buildReport(scanInventory(run), new Date('2026-10-07T12:00:00.000Z'));
  assert.equal(report.provenance, 'live-host-scan');
  assert.equal(report.status, 'detected');
  assert.equal(report.source, 'dpkg-query');
  assert.equal(report.version.normalized, '5.6.1');
  assert.equal(report.policyAssessment.result, 'matches-exact-set');
  assert.match(report.measurementDigest, /^[0-9a-f]{64}$/);
});

test('does not falsely flag an Ubuntu +really rollback as XZ 5.6.1', () => {
  const run = () => 'install ok installed\t5.6.1+really5.4.5-1ubuntu0.2\n';
  const report = buildReport(scanInventory(run), new Date('2026-10-07T12:00:00.000Z'));
  assert.equal(report.version.normalized, '5.4.5');
  assert.equal(report.policyAssessment.result, 'outside-exact-set');
  assert.equal('hostname' in report.host, false);
});

test('does not invent a version when no package manager detects XZ', () => {
  const unavailable = () => { throw Object.assign(new Error('missing'), { code: 'ENOENT' }); };
  const report = buildReport(scanInventory(unavailable), new Date('2026-10-07T12:00:00.000Z'));
  assert.equal(report.status, 'not-detected');
  assert.equal('version' in report, false);
  assert.equal('measurementDigest' in report, false);
});
