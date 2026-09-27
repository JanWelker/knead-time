import { describe, expect, it } from 'vitest';
import { scopedStorageKey, storageScopeFor } from './storageScope';

describe('storageScopeFor', () => {
	// Production: static/CNAME serves the app from the root, so the scope is
	// empty and every key stays exactly what returning users already have.
	it('is empty at the root, so existing keys do not move', () => {
		expect(storageScopeFor('')).toBe('');
	});

	// The PR preview is served from the production origin under a subdirectory,
	// which is the whole reason the scope exists.
	it.each([
		['/pr-preview/pr-12', ':pr-preview-pr-12'],
		['/knead-time', ':knead-time'],
		['/knead-time/pr-preview/pr-3', ':knead-time-pr-preview-pr-3'],
		['/pr-preview/pr-7/', ':pr-preview-pr-7']
	])('slugs %s to %s', (basePath, scope) => {
		expect(storageScopeFor(basePath)).toBe(scope);
	});

	it('keeps a key valid when a base path carries punctuation', () => {
		expect(storageScopeFor('/a b/c:d')).toBe(':a-b-c-d');
	});
});

describe('scopedStorageKey', () => {
	it('reproduces the historical literal at the root scope', () => {
		expect(scopedStorageKey('theme', '')).toBe('kneadtime:theme');
	});

	it('puts the scope between the app prefix and the slot name', () => {
		expect(scopedStorageKey('theme', ':pr-preview-pr-12')).toBe('kneadtime:pr-preview-pr-12:theme');
	});
});
