#!/usr/bin/env node
// A ratchet: a change may add tests, never quietly remove them.
//
// The 100 % coverage gate does not catch this on its own. Coverage is a ratio,
// so deleting a test and the branch it covered keeps it at 100 %, and the
// browser suite has no coverage gate at all — an e2e spec can simply be deleted
// and nothing complains. The counts therefore live in a committed file, and
// this script fails when reality and that file disagree in either direction:
// a drop is refused, and a rise has to be written down, so the number in the
// repo is always the number of tests that actually exist.
//
// The counts are recorded per test file, not as two totals. A total is blind
// to a swap: ten tests deleted from schedule.test.ts and ten added to a new
// file is a net zero that never touched the baseline, and the deletion was
// invisible in review. Per file, both halves of the swap show up as a change
// to this file's committed JSON.
//
// The coverage gate itself is pinned the same way — its four thresholds, and
// the include/exclude lists that decide which files the thresholds apply to.
// Adding a source file to `exclude` keeps the reported ratio at 100 while the
// file goes untested; that is the one lever that relaxes the gate without
// touching a threshold or a test, and it now needs the baseline edited too.
//
// Lowering any of it is still possible — some tests genuinely stop applying —
// but only as an explicit edit to a tracked file, visible in review, rather
// than as a silent side effect of deleting a spec. `--write` regenerates the
// file from what the runners currently collect, so recording a rise is one
// command and the diff is the review.
//
// Counts are collected, not run: `vitest list` and `playwright test --list`
// enumerate without executing, so this is cheap enough to sit in front of the
// real suites. `vitest list` still needs .svelte-kit/tsconfig.json, so the npm
// script runs `svelte-kit sync` first — a clean checkout has no such file, and
// the failure it produces looks nothing like a missing tsconfig.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import {
	compare,
	parseCoverageConfig,
	parsePlaywrightList,
	parseVitestList,
	snapshot
} from './lib/testBaseline.mjs';

const BASELINE = new URL('../.github/test-baseline.json', import.meta.url);
const VITEST_CONFIG = new URL('../vitest.config.ts', import.meta.url);

const run = (cmd, args) =>
	execFileSync(cmd, args, { encoding: 'utf8', env: { ...process.env, TZ: 'UTC' } });

// `--no-static-parse` is load-bearing. Vitest 5 made `vitest list` parse test
// files from the AST instead of importing them, which cannot evaluate a
// `test.each` table: every parametrised suite lists as a single row with its
// placeholders unresolved ("isUiMode > $value → $expected"). That reported 642
// tests against 878 actually run — this ratchet read the difference as a mass
// deletion and refused the vitest 5 bump. Importing the files, as vitest 4 did,
// expands the tables and counts what the suite really contains.
//
// Vitest throws on an unknown option, so if the flag is ever dropped this fails
// loudly rather than silently going back to under-counting.
const actual = {
	unitFiles: parseVitestList(run('npx', ['vitest', 'list', '--no-static-parse'])),
	e2eFiles: parsePlaywrightList(run('npx', ['playwright', 'test', '--list'])),
	coverage: parseCoverageConfig(readFileSync(VITEST_CONFIG, 'utf8'))
};

if (process.argv.includes('--write')) {
	writeFileSync(BASELINE, JSON.stringify(snapshot(actual), null, '\t') + '\n');
	// Prettier folds short arrays onto one line; writing its shape directly keeps
	// the committed file clean under `npm run lint` and the pre-commit hook.
	run('npx', ['prettier', '--write', BASELINE.pathname]);
	console.log(`Wrote ${BASELINE.pathname} — review the diff, that is the decision.`);
}

const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
const problems = compare(baseline, actual);

if (problems.length > 0) {
	console.error('\nTest baseline check failed:\n');
	for (const p of problems) console.error(`  • ${p}\n`);
	process.exit(1);
}

const total = (files) => Object.values(files).reduce((a, b) => a + b, 0);
console.log(
	`Test baseline OK — ${total(actual.unitFiles)} unit tests in ${Object.keys(actual.unitFiles).length} files, ` +
		`${total(actual.e2eFiles)} browser tests in ${Object.keys(actual.e2eFiles).length} files, ` +
		`coverage gate at 100 % over ${actual.coverage.include.join(', ')}.`
);
