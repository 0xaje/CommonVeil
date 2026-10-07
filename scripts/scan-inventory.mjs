#!/usr/bin/env node
import { buildReport, scanInventory } from './inventory-scanner.mjs';

const report = buildReport(scanInventory());
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (report.status !== 'detected') {
  process.stderr.write('CommonVeil did not detect an installed XZ Utils version on this host. No exposure claim was created.\n');
  process.exitCode = 2;
}

