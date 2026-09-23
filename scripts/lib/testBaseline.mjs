// The pure half of scripts/check-test-baseline.mjs: parsing what the two test
// runners list, reading the coverage gate out of vitest.config.ts, and the
// comparison itself. No I/O here, so every rule can be pinned by a unit test.

/**
 * `vitest list --no-static-parse` prints one line per collected test,
 * "file > suite > name"; the file is the first segment.
 * @param {string} out
 * @returns {Record<string, number>} tests per test file, sorted by path
 */
export function parseVitestList(out) {
	const counts = {};
	for (const line of out.split('\n')) {
		const sep = line.indexOf(' > ');
		if (sep === -1) continue;
		const file = line.slice(0, sep).trim();
		counts[file] = (counts[file] ?? 0) + 1;
	}
	return sortKeys(counts);
}

/**
 * `playwright test --list` prints "  [project] › file.spec.ts:line:col › name"
 * per test and closes with "Total: N tests in M files".
 * @param {string} out
 * @returns {Record<string, number>} tests per spec file, sorted by path
 */
export function parsePlaywrightList(out) {
	const counts = {};
	for (const line of out.split('\n')) {
		const m = line.match(/›\s+(\S+?):\d+:\d+\s+›/);
		if (!m) continue;
		counts[m[1]] = (counts[m[1]] ?? 0) + 1;
	}
	const total = out.match(/Total:\s+(\d+)\s+tests?/);
	if (!total) throw new Error('could not read a test total out of `playwright test --list`');
	const sum = Object.values(counts).reduce((a, b) => a + b, 0);
	if (sum !== Number(total[1])) {
		throw new Error(
			`playwright listed ${total[1]} tests but ${sum} were attributed to a file — ` +
				`the list format has changed and the per-file ratchet would be wrong`
		);
	}
	return sortKeys(counts);
}

/**
 * The coverage gate has three moving parts, and relaxing any one of them lets
 * uncovered code in without touching a test: the four thresholds, and the two
 * lists that decide which files the thresholds apply to. Adding a source file
 * to `exclude` (or narrowing `include`) keeps the reported ratio at 100 while
 * the file's logic goes untested, so all three are read out of the config.
 * @param {string} src contents of vitest.config.ts
 */
export function parseCoverageConfig(src) {
	const coverage = src.slice(src.indexOf('coverage:'));
	const thresholds = Object.fromEntries(
		['lines', 'functions', 'branches', 'statements'].map((k) => [
			k,
			Number(
				coverage.slice(coverage.indexOf('thresholds:')).match(new RegExp(`${k}:\\s*(\\d+)`))?.[1]
			)
		])
	);
	return {
		include: stringArray(coverage, 'include'),
		exclude: stringArray(coverage, 'exclude'),
		thresholds
	};
}

// A `key: [ 'a', 'b' ]` literal of quoted strings; comments inside are skipped.
function stringArray(src, key) {
	const m = src.match(new RegExp(`\\b${key}:\\s*\\[([^\\]]*)\\]`));
	if (!m) throw new Error(`vitest.config.ts has no coverage.${key} array literal`);
	return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

/**
 * @typedef {{ total: number, files: Record<string, number> }} Counts
 * @typedef {{ unit: Counts, e2e: Counts, coverage: { include: string[], exclude: string[] } }} Baseline
 */

/** What the repo looks like right now, in the shape the baseline file records. */
export function snapshot({ unitFiles, e2eFiles, coverage }) {
	return {
		_comment:
			'Floor for how much testing this repo has, per test file. Regenerate with ' +
			'`npm run test:baseline -- --write` after adding tests; lowering a count or ' +
			'excluding a file from coverage is a deliberate, reviewable edit of this file.',
		unit: withTotal(unitFiles),
		e2e: withTotal(e2eFiles),
		coverage: { include: coverage.include, exclude: coverage.exclude }
	};
}

/**
 * Every way the recorded floor and reality can disagree, as messages telling
 * the reader what to do. Empty means the check passes.
 * @param {Baseline} baseline
 * @param {{ unitFiles: Record<string, number>, e2eFiles: Record<string, number>, coverage: ReturnType<typeof parseCoverageConfig> }} actual
 * @returns {string[]}
 */
export function compare(baseline, actual) {
	const problems = [];

	for (const [kind, min] of Object.entries(actual.coverage.thresholds)) {
		if (min !== 100) {
			problems.push(
				`Coverage threshold for ${kind} is ${min}, not 100. CLAUDE.md commits to 100 % across ` +
					`src/lib/ — delete the unreachable branch instead of relaxing the gate.`
			);
		}
	}

	for (const list of ['include', 'exclude']) {
		const recorded = baseline.coverage[list];
		const current = actual.coverage[list];
		if (JSON.stringify(recorded) !== JSON.stringify(current)) {
			problems.push(
				`vitest coverage.${list} changed from ${JSON.stringify(recorded)} to ` +
					`${JSON.stringify(current)}. The lists decide which files the 100 % gate applies ` +
					`to, so excluding a file relaxes the gate without touching a threshold. If the ` +
					`change is right (CLAUDE.md, Testing: only tests, .svelte runtime modules, pure ` +
					`types, fixtures and the message catalogue are excluded), record it with ` +
					`\`npm run test:baseline -- --write\`.`
			);
		}
	}

	for (const [kind, files] of [
		['unit', actual.unitFiles],
		['e2e', actual.e2eFiles]
	]) {
		const recorded = baseline[kind];
		const paths = new Set([...Object.keys(recorded.files), ...Object.keys(files)]);
		for (const path of [...paths].sort()) {
			const was = recorded.files[path] ?? 0;
			const now = files[path] ?? 0;
			if (now < was) {
				problems.push(
					`${path} dropped from ${was} to ${now} ${kind} tests. If those tests really no ` +
						`longer apply, say so in the commit message and record the new floor with ` +
						`\`npm run test:baseline -- --write\` — removing coverage should be a decision, ` +
						`not a side effect.`
				);
			} else if (now > was) {
				problems.push(
					`${path} rose from ${was} to ${now} ${kind} tests — nice. Record it with ` +
						`\`npm run test:baseline -- --write\` so the floor moves up with you.`
				);
			}
		}
		const total = sum(files);
		if (total !== recorded.total) {
			problems.push(
				`${kind} total is ${total} but the baseline says ${recorded.total}; ` +
					`\`npm run test:baseline -- --write\` rewrites both.`
			);
		}
	}

	return problems;
}

function withTotal(files) {
	return { total: sum(files), files: sortKeys(files) };
}

function sum(files) {
	return Object.values(files).reduce((a, b) => a + b, 0);
}

function sortKeys(obj) {
	// Object keys are unique, so two never compare equal.
	return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => (a < b ? -1 : 1)));
}
