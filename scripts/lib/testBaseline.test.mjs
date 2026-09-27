import { describe, expect, it } from 'vitest';
import {
	compare,
	parseCoverageConfig,
	parsePlaywrightList,
	parseVitestList,
	snapshot
} from './testBaseline.mjs';

const VITEST_OUT = [
	'',
	'src/lib/a.test.ts > suite > one',
	'src/lib/a.test.ts > suite > two',
	'src/lib/b.test.ts > b > only',
	'some banner line without a separator',
	''
].join('\n');

const PLAYWRIGHT_OUT = [
	'Listing tests:',
	'  [chromium] › a.spec.ts:13:1 › first',
	'  [chromium] › a.spec.ts:38:1 › second',
	'  [chromium] › b.spec.ts:5:1 › lone',
	'Total: 3 tests in 2 files',
	''
].join('\n');

const CONFIG = `
export default defineConfig({
	test: {
		include: ['src/**/*.test.ts'],
		coverage: {
			include: ['src/lib/**/*.ts'],
			// a comment inside the literal must not count as an entry
			exclude: ['src/lib/**/*.test.ts', 'src/lib/dough/types.ts'],
			thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 }
		}
	}
});`;

const coverage = parseCoverageConfig(CONFIG);
const clean = snapshot({
	unitFiles: parseVitestList(VITEST_OUT),
	e2eFiles: parsePlaywrightList(PLAYWRIGHT_OUT),
	coverage
});
const actual = {
	unitFiles: parseVitestList(VITEST_OUT),
	e2eFiles: parsePlaywrightList(PLAYWRIGHT_OUT),
	coverage
};

describe('parsing what the runners list', () => {
	it('counts vitest tests per file and skips lines without a separator', () => {
		expect(parseVitestList(VITEST_OUT)).toEqual({ 'src/lib/a.test.ts': 2, 'src/lib/b.test.ts': 1 });
	});

	// The baseline is a committed JSON file, so its key order is part of the
	// diff a reviewer reads; listing order (whatever the runner picked up first)
	// must not leak into it.
	it('sorts files by path whatever order the runner listed them in', () => {
		const out = 'src/lib/z.test.ts > s > a\nsrc/lib/a.test.ts > s > b\nsrc/lib/m.test.ts > s > c\n';
		expect(Object.keys(parseVitestList(out))).toEqual([
			'src/lib/a.test.ts',
			'src/lib/m.test.ts',
			'src/lib/z.test.ts'
		]);
	});

	it('counts playwright tests per spec', () => {
		expect(parsePlaywrightList(PLAYWRIGHT_OUT)).toEqual({ 'a.spec.ts': 2, 'b.spec.ts': 1 });
	});

	it('refuses a playwright listing with no total', () => {
		expect(() => parsePlaywrightList('  [chromium] › a.spec.ts:1:1 › x\n')).toThrow(/test total/);
	});

	// The per-file attribution depends on the line format; if Playwright changes
	// it the totals line would still parse and the ratchet would silently record
	// zero files. Cross-checking the sum against the total is what catches that.
	it('refuses a playwright listing whose rows do not add up to its total', () => {
		expect(() =>
			parsePlaywrightList('  [chromium] · a.spec.ts:1:1 · x\nTotal: 1 test in 1 file')
		).toThrow(/format has changed/);
	});

	it('reads thresholds and both file lists out of the vitest config', () => {
		expect(coverage).toEqual({
			include: ['src/lib/**/*.ts'],
			exclude: ['src/lib/**/*.test.ts', 'src/lib/dough/types.ts'],
			thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 }
		});
	});

	it('fails loudly when a coverage list is not an array literal', () => {
		expect(() => parseCoverageConfig('coverage: { include: SOMETHING }')).toThrow(
			/coverage.include/
		);
	});
});

describe('the snapshot the baseline file records', () => {
	it('carries per-file counts, totals and the coverage lists, keys sorted', () => {
		expect(clean).toEqual({
			_comment: expect.stringContaining('npm run test:baseline -- --write'),
			unit: { total: 3, files: { 'src/lib/a.test.ts': 2, 'src/lib/b.test.ts': 1 } },
			e2e: { total: 3, files: { 'a.spec.ts': 2, 'b.spec.ts': 1 } },
			coverage: {
				include: ['src/lib/**/*.ts'],
				exclude: ['src/lib/**/*.test.ts', 'src/lib/dough/types.ts']
			}
		});
	});
});

describe('the comparison', () => {
	it('passes when reality matches the recorded floor', () => {
		expect(compare(clean, actual)).toEqual([]);
	});

	it('refuses a threshold below 100', () => {
		const relaxed = {
			...actual,
			coverage: { ...coverage, thresholds: { ...coverage.thresholds, branches: 95 } }
		};
		expect(compare(clean, relaxed)).toEqual([expect.stringMatching(/branches is 95, not 100/)]);
	});

	// The finding this pins: a file added to coverage.exclude kept the reported
	// ratio at 100 and the old ratchet green, because it only ever read the
	// thresholds. The lists are part of the gate.
	it('refuses a source file quietly added to coverage.exclude', () => {
		const excluded = {
			...actual,
			coverage: { ...coverage, exclude: [...coverage.exclude, 'src/lib/dough/schedule.ts'] }
		};
		expect(compare(clean, excluded)).toEqual([
			expect.stringMatching(/coverage\.exclude changed .* excluding a file relaxes the gate/)
		]);
	});

	it('refuses coverage.include being narrowed', () => {
		const narrowed = { ...actual, coverage: { ...coverage, include: ['src/lib/dough/**'] } };
		expect(compare(clean, narrowed)).toEqual([expect.stringMatching(/coverage\.include changed/)]);
	});

	it('refuses a drop in one file', () => {
		const dropped = { ...actual, unitFiles: { 'src/lib/a.test.ts': 1, 'src/lib/b.test.ts': 1 } };
		expect(compare(clean, dropped)).toEqual([
			expect.stringMatching(/src\/lib\/a\.test\.ts dropped from 2 to 1 unit tests/),
			expect.stringMatching(/unit total is 2 but the baseline says 3/)
		]);
	});

	it('asks for a rise to be recorded', () => {
		const rose = { ...actual, e2eFiles: { 'a.spec.ts': 2, 'b.spec.ts': 1, 'c.spec.ts': 4 } };
		expect(compare(clean, rose)).toEqual([
			expect.stringMatching(/c\.spec\.ts rose from 0 to 4 e2e tests/),
			expect.stringMatching(/e2e total is 7 but the baseline says 3/)
		]);
	});

	// The finding this pins: the old script compared two totals, so deleting
	// ten tests in one file and adding ten in another passed without the
	// baseline changing — the deletion never reached review.
	it('sees a net-zero swap between two files as both a drop and a rise', () => {
		const swapped = { ...actual, unitFiles: { 'src/lib/a.test.ts': 1, 'src/lib/c.test.ts': 2 } };
		expect(compare(clean, swapped)).toEqual([
			expect.stringMatching(/a\.test\.ts dropped from 2 to 1/),
			expect.stringMatching(/b\.test\.ts dropped from 1 to 0/),
			expect.stringMatching(/c\.test\.ts rose from 0 to 2/)
		]);
	});

	it('refuses a hand-edited total that disagrees with its own files', () => {
		const inconsistent = { ...clean, unit: { ...clean.unit, total: 99 } };
		expect(compare(inconsistent, actual)).toEqual([
			expect.stringMatching(/unit total is 3 but the baseline says 99/)
		]);
	});
});
