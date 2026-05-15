import { describe, expect, it, vi } from 'vitest';
import { computeSchedule } from '../dough/schedule';
import type { DoughInputs } from '../dough/types';
import { MESSAGES } from '../i18n/messages';
import { buildMergeVariables, sendToTrmnl, TRMNL_WEBHOOK_BASE } from './webhook';

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

describe('buildMergeVariables', () => {
	it('returns a complete merge_variables payload for a defaults-only recipe', () => {
		const i = inputs();
		const s = computeSchedule(i);
		const now = new Date('2026-05-12T10:00:00Z');
		const m = buildMergeVariables(i, s, MESSAGES.en, 'en', now);

		expect(m.title).toBe('Knead Time');
		expect(m.summary).toContain('6 × 280 g');
		expect(m.summary).toContain('70%');
		expect(m.summary).toContain('Fresh yeast');
		expect(m.summary).toContain('Room ferment');
		expect(m.ready_label).toBe(MESSAGES.en.form.readyBy);
		expect(m.ready_time).not.toContain(',');
		expect(m.ready_time_unix).toBe(Math.floor(i.readyBy.getTime() / 1000));
		expect(m.labels.now).toBe(MESSAGES.en.trmnl.now);
		expect(m.labels.next).toBe(MESSAGES.en.trmnl.next);
		expect(m.labels.done).toBe(MESSAGES.en.trmnl.done);
		expect(m.generated_at).toBe(now.toISOString());
		expect(m.locale).toBe('en');
		expect(m.steps.length).toBe(s.steps.length);
	});

	it('marks the ready step as is_ready and gives it no duration', () => {
		const i = inputs();
		const s = computeSchedule(i);
		const m = buildMergeVariables(i, s, MESSAGES.en, 'en', new Date('2026-05-12T10:00:00Z'));
		const ready = m.steps.find((step) => step.is_ready)!;
		expect(ready.duration).toBe('—');
		expect(ready.duration_minutes).toBe(0);
	});

	it('attaches at_unix to each step for Liquid date-arithmetic', () => {
		const i = inputs();
		const s = computeSchedule(i);
		const m = buildMergeVariables(i, s, MESSAGES.en, 'en', new Date('2026-05-12T10:00:00Z'));
		// Sorted in forward time, matches the schedule.
		for (let k = 0; k < m.steps.length; k++) {
			expect(m.steps[k].at_unix).toBe(Math.floor(s.steps[k].at.getTime() / 1000));
		}
	});

	it('includes a biga label in the summary when biga is selected', () => {
		const i = inputs({
			startAt: new Date('2026-05-11T07:00:00Z'),
			preFerment: { type: 'biga', flourPercent: 30 }
		});
		const m = buildMergeVariables(
			i,
			computeSchedule(i),
			MESSAGES.en,
			'en',
			new Date('2026-05-11T06:00:00Z')
		);
		expect(m.summary.toLowerCase()).toContain('biga');
	});

	it('includes a poolish label in the summary when poolish is selected', () => {
		const i = inputs({
			startAt: new Date('2026-05-11T07:00:00Z'),
			preFerment: { type: 'poolish', flourPercent: 30 }
		});
		const m = buildMergeVariables(
			i,
			computeSchedule(i),
			MESSAGES.en,
			'en',
			new Date('2026-05-11T06:00:00Z')
		);
		expect(m.summary.toLowerCase()).toContain('poolish');
	});

	it('uses the sourdough yeast label when yeastType is sourdough', () => {
		const i = inputs({ yeastType: 'sourdough' });
		const m = buildMergeVariables(
			i,
			computeSchedule(i),
			MESSAGES.en,
			'en',
			new Date('2026-05-12T10:00:00Z')
		);
		expect(m.summary).toContain('Sourdough');
	});

	it('surfaces the cold-ferment mode label when the window triggers cold mode', () => {
		const i = inputs({
			startAt: new Date('2026-05-11T07:00:00Z'),
			readyBy: new Date('2026-05-12T19:00:00Z')
		});
		const m = buildMergeVariables(
			i,
			computeSchedule(i),
			MESSAGES.en,
			'en',
			new Date('2026-05-11T06:00:00Z')
		);
		expect(m.summary).toContain('Cold ferment');
	});

	it('localizes labels and summary in another locale', () => {
		const i = inputs();
		const m = buildMergeVariables(i, computeSchedule(i), MESSAGES.de, 'de', new Date());
		expect(m.summary).toContain('Frischhefe');
		expect(m.ready_label).toBe(MESSAGES.de.form.readyBy);
		expect(m.locale).toBe('de');
	});
});

describe('sendToTrmnl', () => {
	const uuid = '123e4567-e89b-12d3-a456-426614174000';
	const payload = buildMergeVariables(
		inputs(),
		computeSchedule(inputs()),
		MESSAGES.en,
		'en',
		new Date('2026-05-12T10:00:00Z')
	);

	it('POSTs JSON with merge_variables to the right URL', async () => {
		const mock: typeof fetch = vi.fn(async () => new Response(null, { status: 200 }));
		const result = await sendToTrmnl(uuid, payload, mock);
		expect(result).toEqual({ ok: true });
		const calls = (mock as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls;
		expect(calls).toHaveLength(1);
		const [url, init] = calls[0];
		expect(url).toBe(TRMNL_WEBHOOK_BASE + uuid);
		expect(init.method).toBe('POST');
		const headers = init.headers as Record<string, string>;
		expect(headers['Content-Type']).toBe('application/json');
		const body = JSON.parse(init.body as string);
		expect(body.merge_variables).toEqual(payload);
	});

	it('returns an error result when the server replies non-2xx with a JSON message', async () => {
		const mock = vi.fn(
			async () =>
				new Response(JSON.stringify({ message: 'Private Plugin not found' }), {
					status: 404,
					headers: { 'Content-Type': 'application/json' }
				})
		);
		const result = await sendToTrmnl(uuid, payload, mock);
		expect(result).toEqual({ ok: false, status: 404, message: 'Private Plugin not found' });
	});

	it('falls back to the HTTP status when the server reply is not JSON', async () => {
		const mock = vi.fn(async () => new Response('plain bad', { status: 500 }));
		const result = await sendToTrmnl(uuid, payload, mock);
		expect(result).toEqual({ ok: false, status: 500, message: 'HTTP 500' });
	});

	it('falls back to the HTTP status when the JSON response lacks a message field', async () => {
		const mock = vi.fn(
			async () =>
				new Response(JSON.stringify({ other: 'noise' }), {
					status: 422,
					headers: { 'Content-Type': 'application/json' }
				})
		);
		const result = await sendToTrmnl(uuid, payload, mock);
		expect(result).toEqual({ ok: false, status: 422, message: 'HTTP 422' });
	});

	it('surfaces network errors as ok:false with status 0', async () => {
		const mock = vi.fn(async () => {
			throw new Error('network down');
		});
		const result = await sendToTrmnl(uuid, payload, mock);
		expect(result).toEqual({ ok: false, status: 0, message: 'network down' });
	});

	it('handles non-Error throwables (e.g. strings) from fetch', async () => {
		const mock = vi.fn(async () => {
			throw 'opaque failure';
		});
		const result = await sendToTrmnl(uuid, payload, mock);
		expect(result).toEqual({ ok: false, status: 0, message: 'opaque failure' });
	});
});
