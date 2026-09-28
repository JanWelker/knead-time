import { describe, expect, it, vi } from 'vitest';
import { deleteSchedule, fetchVapidKey, PUSH_ORIGIN, putSchedule } from './api';

const SUB = { endpoint: 'https://web.push.apple.com/abc', keys: { p256dh: 'p', auth: 'a' } };
const PAYLOAD = { receipt: { title: 'Set', body: '3' }, reminders: [] };

function replying(status: number, body: unknown, json = true) {
	return vi.fn(async () => {
		return new Response(json ? JSON.stringify(body) : String(body), {
			status,
			headers: json ? { 'Content-Type': 'application/json' } : {}
		});
	}) as unknown as typeof fetch;
}

describe('the service origin', () => {
	it('is the homelab host the build inlines', () => {
		expect(PUSH_ORIGIN).toBe('https://kneadtime.k8s.wlkr.ch');
	});
});

describe('fetchVapidKey', () => {
	it('reads the key off GET /v1/vapid', async () => {
		const f = replying(200, { publicKey: 'BKey' });
		expect(await fetchVapidKey(f)).toEqual({ ok: true, value: 'BKey' });
		expect(f).toHaveBeenCalledWith(`${PUSH_ORIGIN}/v1/vapid`, { method: 'GET' });
	});

	it('fails on a reply without a key', async () => {
		expect(await fetchVapidKey(replying(200, {}))).toEqual({
			ok: false,
			status: 200,
			message: 'no key in the reply'
		});
	});

	it('fails on a broken reply body', async () => {
		const result = await fetchVapidKey(replying(200, 'not json', false));
		expect(result.ok).toBe(false);
	});
});

describe('putSchedule', () => {
	it('PUTs the subscription beside the payload and returns the receipt', async () => {
		const f = replying(200, { scheduled: 3, dropped: 0, receipt: true });
		const result = await putSchedule(SUB, PAYLOAD, f);
		expect(result).toEqual({ ok: true, value: { scheduled: 3, dropped: 0, receipt: true } });
		const [url, init] = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [
			string,
			RequestInit
		];
		expect(url).toBe(`${PUSH_ORIGIN}/v1/schedules`);
		expect(init.method).toBe('PUT');
		expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
		expect(JSON.parse(init.body as string)).toEqual({ subscription: SUB, ...PAYLOAD });
	});

	it('reports the service’s own reason on a refusal', async () => {
		expect(await putSchedule(SUB, PAYLOAD, replying(410, { detail: 'refused' }))).toEqual({
			ok: false,
			status: 410,
			message: 'refused'
		});
	});

	it('falls back to the status when the error body is not JSON', async () => {
		expect(await putSchedule(SUB, PAYLOAD, replying(502, 'Bad Gateway', false))).toEqual({
			ok: false,
			status: 502,
			message: 'HTTP 502'
		});
	});

	it('falls back to the status when the error body has no detail', async () => {
		expect(await putSchedule(SUB, PAYLOAD, replying(422, { errors: [] }))).toEqual({
			ok: false,
			status: 422,
			message: 'HTTP 422'
		});
	});

	it('never throws: a network failure is a result with status 0', async () => {
		const f = vi.fn(async () => {
			throw new TypeError('Failed to fetch');
		}) as unknown as typeof fetch;
		expect(await putSchedule(SUB, PAYLOAD, f)).toEqual({
			ok: false,
			status: 0,
			message: 'Failed to fetch'
		});
		const g = vi.fn(async () => {
			throw 'offline';
		}) as unknown as typeof fetch;
		expect(await putSchedule(SUB, PAYLOAD, g)).toEqual({ ok: false, status: 0, message: 'offline' });
	});
});

describe('deleteSchedule', () => {
	it('DELETEs by endpoint in the query, URL-encoded', async () => {
		const f = vi.fn(async () => new Response(null, { status: 204 })) as unknown as typeof fetch;
		expect(await deleteSchedule('https://a/b?c=d', f)).toEqual({ ok: true, value: undefined });
		expect(f).toHaveBeenCalledWith(
			`${PUSH_ORIGIN}/v1/schedules?endpoint=${encodeURIComponent('https://a/b?c=d')}`,
			{ method: 'DELETE' }
		);
	});

	it('reports an unknown subscription', async () => {
		const result = await deleteSchedule('x', replying(404, { detail: 'unknown subscription' }));
		expect(result).toEqual({ ok: false, status: 404, message: 'unknown subscription' });
	});
});
