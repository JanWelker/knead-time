import { describe, expect, it, vi } from 'vitest';
import { computeSchedule } from '../dough/schedule';
import { defaultInputs as inputs } from '../dough/testFixtures';
import { LOCALES, MESSAGES } from '../i18n/messages';
import { buildMergeVariables, sendToTrmnl, TRMNL_WEBHOOK_BASE } from './webhook';

describe('buildMergeVariables', () => {
	it('returns a short-key payload for a defaults-only recipe', () => {
		const i = inputs();
		const s = computeSchedule(i);
		const m = buildMergeVariables(i, s, MESSAGES.en, 'en');

		expect(m.t).toBe('Knead Time');
		expect(m.s).toContain('6 × 280 g');
		expect(m.s).toContain('70%');
		expect(m.s).toContain('Fresh yeast');
		expect(m.s).toContain('Room ferment');
		expect(m.rl).toBe(MESSAGES.en.form.readyBy);
		expect(m.rt).not.toContain(',');
		expect(m.l.n).toBe(MESSAGES.en.trmnl.now);
		expect(m.l.x).toBe(MESSAGES.en.trmnl.next);
		expect(m.l.d).toBe(MESSAGES.en.trmnl.done);
		expect(m.l.sn).toBe(MESSAGES.en.trmnl.since);
		expect(m.l.lf).toBe(MESSAGES.en.trmnl.left);
		expect(m.l.uh).toBe(MESSAGES.en.trmnl.unit_h);
		expect(m.l.um).toBe(MESSAGES.en.trmnl.unit_min);
		expect(m.st.length).toBe(s.steps.length);
	});

	it('attaches step.du as duration_seconds for the Now-panel Liquid math', () => {
		const i = inputs();
		const s = computeSchedule(i);
		const m = buildMergeVariables(i, s, MESSAGES.en, 'en');
		for (let k = 0; k < m.st.length; k++) {
			expect(m.st[k].du).toBe(s.steps[k].durationMinutes * 60);
		}
	});

	it('marks the ready step with r=true and gives it duration "—"', () => {
		const i = inputs();
		const m = buildMergeVariables(i, computeSchedule(i), MESSAGES.en, 'en');
		const ready = m.st.find((step) => step.r)!;
		expect(ready.dr).toBe('—');
	});

	it('attaches step.u as unix seconds matching the schedule', () => {
		const i = inputs();
		const s = computeSchedule(i);
		const m = buildMergeVariables(i, s, MESSAGES.en, 'en');
		for (let k = 0; k < m.st.length; k++) {
			expect(m.st[k].u).toBe(Math.floor(s.steps[k].at.getTime() / 1000));
		}
	});

	it('includes a biga label in the summary when biga is selected', () => {
		const i = inputs({
			startAt: new Date('2026-05-11T07:00:00Z'),
			preFerments: [{ type: 'biga', flourPercent: 30 }]
		});
		const m = buildMergeVariables(i, computeSchedule(i), MESSAGES.en, 'en');
		expect(m.s.toLowerCase()).toContain('biga');
	});

	it('includes a poolish label in the summary when poolish is selected', () => {
		const i = inputs({
			startAt: new Date('2026-05-11T07:00:00Z'),
			preFerments: [{ type: 'poolish', flourPercent: 30 }]
		});
		const m = buildMergeVariables(i, computeSchedule(i), MESSAGES.en, 'en');
		expect(m.s.toLowerCase()).toContain('poolish');
	});

	it('uses the sourdough yeast label when yeastType is sourdough', () => {
		const i = inputs({ yeastType: 'sourdough' });
		const m = buildMergeVariables(i, computeSchedule(i), MESSAGES.en, 'en');
		expect(m.s).toContain('Sourdough');
	});

	it('surfaces the cold-ferment mode label when the window triggers cold mode', () => {
		const i = inputs({
			startAt: new Date('2026-05-11T07:00:00Z'),
			readyBy: new Date('2026-05-12T19:00:00Z')
		});
		const m = buildMergeVariables(i, computeSchedule(i), MESSAGES.en, 'en');
		expect(m.s).toContain('Cold ferment');
	});

	it('localizes labels and summary in another locale', () => {
		const i = inputs();
		const m = buildMergeVariables(i, computeSchedule(i), MESSAGES.de, 'de');
		expect(m.s).toContain('Frischhefe');
		expect(m.rl).toBe(MESSAGES.de.form.readyBy);
	});

	it('keeps a cold-mode + biga + poolish payload under TRMNL free tier 2 KB cap in every locale', () => {
		// Cold mode + both pre-ferments is the worst case: 9 steps (two
		// preferment-mix rows) with the longest titles and the longest summary
		// label ("Biga + Poolish"). German/French translations of step titles
		// are noticeably longer than English, so the cap must hold for every
		// locale we ship — checking only `en` once let an over-cap regression
		// slip through.
		const i = inputs({
			startAt: new Date('2026-05-11T07:00:00Z'),
			readyBy: new Date('2026-05-12T19:00:00Z'),
			preFerments: [
				{ type: 'biga', flourPercent: 30 },
				{ type: 'poolish', flourPercent: 20 }
			]
		});
		const s = computeSchedule(i);
		for (const loc of LOCALES) {
			const m = buildMergeVariables(i, s, MESSAGES[loc], loc);
			const wireBytes = new TextEncoder().encode(JSON.stringify({ merge_variables: m })).length;
			expect(wireBytes, `locale ${loc} payload over 2 KB cap`).toBeLessThan(2048);
		}
	});
});

describe('sendToTrmnl', () => {
	const uuid = '123e4567-e89b-12d3-a456-426614174000';
	const payload = buildMergeVariables(inputs(), computeSchedule(inputs()), MESSAGES.en, 'en');

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
