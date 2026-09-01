#!/usr/bin/env node
// A ratchet: a change may add tests, never quietly remove them.
//
// The 100 % coverage gate does not catch this on its own. Coverage is a ratio,
// so deleting a test and the branch it covered keeps it at 100 %, and the
// browser suite has no coverage gate at all — an e2e spec can simply be deleted
// and nothing complains. Both counts therefore live in a committed file, and
// this script fails when reality and that file disagree in either direction:
// a drop is refused, and a rise has to be written down, so the number in the
// repo is always the number of tests that actually exist.
//
// Lowering it is still possible — some tests genuinely stop applying — but only
// as an explicit edit to a tracked file, visible in review, rather than as a
// silent side effect of deleting a spec.
//
// Counts are collected, not run: `vitest list` and `playwright test --list`
// enumerate without executing, so this is cheap enough to sit in front of the
// real suites. `vitest list` still needs .svelte-kit/tsconfig.json, so the npm
// script runs `svelte-kit sync` first — a clean checkout has no such file, and
// the failure it produces looks nothing like a missing tsconfig.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const BASELINE = new URL('../.github/test-baseline.json', import.meta.url);
const VITEST_CONFIG = new URL('../vitest.config.ts', import.meta.url);

const run = (cmd, args) =>
	execFileSync(cmd, args, { encoding: 'utf8', env: { ...process.env, TZ: 'UTC' } });

function unitTestCount() {
	// One line per collected test: "file > suite > name".
	return run('npx', ['vitest', 'list'])
		.split('\n')
		.filter((l) => l.includes(' > ')).length;
}

function e2eTestCount() {
	const out = run('npx', ['playwright', 'test', '--list']);
	const m = out.match(/Total:\s+(\d+)\s+tests?/);
	if (!m) throw new Error('could not read a test total out of `playwright test --list`');
	return Number(m[1]);
}

// The coverage gate is part of "how much testing" too: dropping a threshold
// from 100 would let uncovered code in without touching a single test.
function coverageThresholds() {
	const src = readFileSync(VITEST_CONFIG, 'utf8');
	const block = src.slice(src.indexOf('thresholds:'));
	return Object.fromEntries(
		['lines', 'functions', 'branches', 'statements'].map((k) => [
			k,
			Number(block.match(new RegExp(`${k}:\\s*(\\d+)`))?.[1])
		])
	);
}

const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
const actual = { unit: unitTestCount(), e2e: e2eTestCount() };
const thresholds = coverageThresholds();

const problems = [];

for (const [kind, min] of Object.entries(thresholds)) {
	if (min !== 100) {
		problems.push(
			`Coverage threshold for ${kind} is ${min}, not 100. CLAUDE.md commits to 100 % across ` +
				`src/lib/ — delete the unreachable branch instead of relaxing the gate.`
		);
	}
}

for (const kind of ['unit', 'e2e']) {
	if (actual[kind] < baseline[kind]) {
		problems.push(
			`${kind} tests dropped from ${baseline[kind]} to ${actual[kind]}. If those tests really ` +
				`no longer apply, say so in the commit message and set "${kind}": ${actual[kind]} in ` +
				`.github/test-baseline.json — removing coverage should be a decision, not a side effect.`
		);
	} else if (actual[kind] > baseline[kind]) {
		problems.push(
			`${kind} tests rose from ${baseline[kind]} to ${actual[kind]} — nice. Record it: set ` +
				`"${kind}": ${actual[kind]} in .github/test-baseline.json so the floor moves up with you.`
		);
	}
}

if (problems.length > 0) {
	console.error('\nTest baseline check failed:\n');
	for (const p of problems) console.error(`  • ${p}\n`);
	process.exit(1);
}

console.log(
	`Test baseline OK — ${actual.unit} unit, ${actual.e2e} browser, coverage gate at 100 %.`
);
