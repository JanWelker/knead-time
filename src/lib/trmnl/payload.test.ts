import { describe, expect, it } from 'vitest';
import { computeSchedule } from '../dough/schedule';
import type { DoughInputs } from '../dough/types';
import { MESSAGES } from '../i18n/messages';
import {
	buildTrmnlPayload,
	decodeTrmnlPayload,
	encodeTrmnlPayload,
	type TrmnlPayload
} from './payload';

function inputs(overrides: Partial<DoughInputs> = {}): DoughInputs {
	return {
		readyBy: new Date('2026-05-12T19:00:00Z'),
		startAt: new Date('2026-05-12T13:00:00Z'),
		pizzaCount: 6,
		ballWeight: 280,
		hydration: 70,
		saltPercent: 3,
		yeastType: 'fresh',
		starterHydration: 100,
		roomTempC: 22,
		fridgeTempC: 4,
		preFerment: null,
		...overrides
	};
}

describe('buildTrmnlPayload', () => {
	it('summarises pizzas, hydration, yeast and mode (room)', () => {
		const i = inputs();
		const schedule = computeSchedule(i);
		const payload = buildTrmnlPayload(
			i,
			schedule,
			MESSAGES.en,
			'en',
			new Date('2026-05-12T10:00:00Z')
		);
		expect(payload.summary).toContain('6 × 280 g');
		expect(payload.summary).toContain('70%');
		expect(payload.summary).toContain('Fresh yeast');
		expect(payload.summary).toContain('Room ferment');
		expect(payload.summary).not.toContain('Biga');
	});

	it('summarises pre-ferment label when set', () => {
		const i = inputs({
			startAt: new Date('2026-05-11T07:00:00Z'),
			preFerment: { type: 'biga', flourPercent: 30 }
		});
		const schedule = computeSchedule(i);
		const payload = buildTrmnlPayload(
			i,
			schedule,
			MESSAGES.en,
			'en',
			new Date('2026-05-11T06:00:00Z')
		);
		expect(payload.summary.toLowerCase()).toContain('biga');
	});

	it('summarises poolish pre-ferment label too', () => {
		const i = inputs({
			startAt: new Date('2026-05-11T07:00:00Z'),
			preFerment: { type: 'poolish', flourPercent: 30 }
		});
		const schedule = computeSchedule(i);
		const payload = buildTrmnlPayload(
			i,
			schedule,
			MESSAGES.en,
			'en',
			new Date('2026-05-11T06:00:00Z')
		);
		expect(payload.summary.toLowerCase()).toContain('poolish');
	});

	it('summarises sourdough yeast label', () => {
		const i = inputs({ yeastType: 'sourdough' });
		const schedule = computeSchedule(i);
		const payload = buildTrmnlPayload(
			i,
			schedule,
			MESSAGES.en,
			'en',
			new Date('2026-05-12T10:00:00Z')
		);
		expect(payload.summary).toContain('Sourdough');
	});

	it('summarises cold mode when window allows it', () => {
		const i = inputs({
			startAt: new Date('2026-05-11T07:00:00Z'),
			readyBy: new Date('2026-05-12T19:00:00Z')
		});
		const schedule = computeSchedule(i);
		const payload = buildTrmnlPayload(
			i,
			schedule,
			MESSAGES.en,
			'en',
			new Date('2026-05-11T06:00:00Z')
		);
		expect(payload.summary).toContain('Cold ferment');
	});

	it('strips commas from the readyTime so it stays one line', () => {
		const i = inputs();
		const schedule = computeSchedule(i);
		const payload = buildTrmnlPayload(
			i,
			schedule,
			MESSAGES.en,
			'en',
			new Date('2026-05-12T10:00:00Z')
		);
		expect(payload.readyTime).not.toContain(',');
	});

	it('featured = "next" with the first step when now is before the schedule', () => {
		const i = inputs();
		const schedule = computeSchedule(i);
		const payload = buildTrmnlPayload(
			i,
			schedule,
			MESSAGES.en,
			'en',
			new Date('2026-05-11T00:00:00Z')
		);
		expect(payload.featured).not.toBeNull();
		expect(payload.featured!.label).toBe(MESSAGES.en.trmnl.next);
		expect(payload.featured!.isDone).toBe(false);
	});

	it('featured = "now" with the current step mid-schedule', () => {
		const i = inputs();
		const schedule = computeSchedule(i);
		// At 14:00Z the bulk step is in progress (mid-schedule)
		const payload = buildTrmnlPayload(
			i,
			schedule,
			MESSAGES.en,
			'en',
			new Date('2026-05-12T14:00:00Z')
		);
		expect(payload.featured!.label).toBe(MESSAGES.en.trmnl.now);
		expect(payload.featured!.isDone).toBe(false);
		expect(payload.featured!.timeRange).toMatch(/\d{1,2}:\d{2}/);
	});

	it('featured = "done" with the ready step once readyBy has passed', () => {
		const i = inputs();
		const schedule = computeSchedule(i);
		const payload = buildTrmnlPayload(
			i,
			schedule,
			MESSAGES.en,
			'en',
			new Date('2026-05-13T00:00:00Z')
		);
		expect(payload.featured!.label).toBe(MESSAGES.en.trmnl.done);
		expect(payload.featured!.isDone).toBe(true);
		expect(payload.featured!.timeRange).toBe('');
		expect(payload.featured!.description).toBe('');
	});

	it('featured = null when the schedule has no steps', () => {
		const fakeSchedule = { ...computeSchedule(inputs()), steps: [] };
		const payload = buildTrmnlPayload(
			inputs(),
			fakeSchedule,
			MESSAGES.en,
			'en',
			new Date('2026-05-12T10:00:00Z')
		);
		expect(payload.featured).toBeNull();
		expect(payload.steps).toEqual([]);
	});

	it('renders each step with localized title, date, time, duration and ready flag', () => {
		const i = inputs();
		const schedule = computeSchedule(i);
		const payload = buildTrmnlPayload(
			i,
			schedule,
			MESSAGES.en,
			'en',
			new Date('2026-05-12T10:00:00Z')
		);
		expect(payload.steps.length).toBe(schedule.steps.length);
		const ready = payload.steps.find((s) => s.isReady)!;
		expect(ready.duration).toBe('—');
		expect(ready.title).toBe(MESSAGES.en.steps.ready);
		const mix = payload.steps.find((s) => s.title === MESSAGES.en.steps.mix)!;
		expect(mix.duration).toMatch(/\d/);
		expect(mix.atIso).toMatch(/^\d{4}-\d{2}-\d{2}T/);
	});

	it('localizes labels (DE)', () => {
		const i = inputs();
		const schedule = computeSchedule(i);
		const payload = buildTrmnlPayload(
			i,
			schedule,
			MESSAGES.de,
			'de',
			new Date('2026-05-12T10:00:00Z')
		);
		expect(payload.summary).toContain('Frischhefe');
		expect(payload.readyLabel).toBe(MESSAGES.de.form.readyBy);
	});
});

describe('encodeTrmnlPayload / decodeTrmnlPayload', () => {
	function samplePayload(): TrmnlPayload {
		const i = inputs();
		return buildTrmnlPayload(
			i,
			computeSchedule(i),
			MESSAGES.en,
			'en',
			new Date('2026-05-12T10:00:00Z')
		);
	}

	it('round-trips a payload through base64 JSON', () => {
		const payload = samplePayload();
		const encoded = encodeTrmnlPayload(payload);
		const decoded = decodeTrmnlPayload(encoded);
		expect(decoded).toEqual(payload);
	});

	it('round-trips non-latin characters (utf-8 safe)', () => {
		const i = inputs();
		const payload = buildTrmnlPayload(
			i,
			computeSchedule(i),
			MESSAGES.de,
			'de',
			new Date('2026-05-12T10:00:00Z')
		);
		const encoded = encodeTrmnlPayload(payload);
		const decoded = decodeTrmnlPayload(encoded);
		expect(decoded!.summary).toBe(payload.summary);
	});

	it('returns null on a garbage base64 input', () => {
		expect(decodeTrmnlPayload('!!!not-valid-base64!!!')).toBeNull();
	});

	it('returns null when decoded bytes are not valid JSON', () => {
		// "hello" base64-encoded is not JSON
		expect(decodeTrmnlPayload('aGVsbG8=')).toBeNull();
	});
});
