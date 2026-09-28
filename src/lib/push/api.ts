// The reminder service, and the three requests the app makes of it — each on
// an explicit tap, never on load. Mirrors sendToTrmnl: an injectable fetch and
// a result that never throws, so the dialog has one shape to render.

import type { SchedulePayload } from './reminders';

export const PUSH_ORIGIN: string = __PUSH_ORIGIN__;

export interface PushSubscriptionInfo {
	endpoint: string;
	keys: { p256dh: string; auth: string };
}

export interface ScheduleReceipt {
	scheduled: number;
	dropped: number;
	receipt: boolean;
}

export type PushResult<T> = { ok: true; value: T } | { ok: false; status: number; message: string };

async function request<T>(
	fetchImpl: typeof fetch,
	path: string,
	init: RequestInit,
	read: (res: Response) => Promise<T>
): Promise<PushResult<T>> {
	let res: Response;
	try {
		res = await fetchImpl(PUSH_ORIGIN + path, init);
	} catch (err) {
		return { ok: false, status: 0, message: reason(err) };
	}
	if (!res.ok) return { ok: false, status: res.status, message: await errorMessage(res) };
	try {
		return { ok: true, value: await read(res) };
	} catch (err) {
		return { ok: false, status: res.status, message: reason(err) };
	}
}

function reason(err: unknown): string {
	return err instanceof Error ? err.message : String(err);
}

async function errorMessage(res: Response): Promise<string> {
	try {
		const body = (await res.json()) as { detail?: unknown };
		if (typeof body.detail === 'string') return body.detail;
	} catch {
		// non-JSON error body — keep the HTTP status as the message
	}
	return `HTTP ${res.status}`;
}

export function fetchVapidKey(fetchImpl: typeof fetch = fetch): Promise<PushResult<string>> {
	return request(fetchImpl, '/v1/vapid', { method: 'GET' }, async (res) => {
		const body = (await res.json()) as { publicKey?: unknown };
		if (typeof body.publicKey !== 'string') throw new Error('no key in the reply');
		return body.publicKey;
	});
}

export function putSchedule(
	subscription: PushSubscriptionInfo,
	payload: SchedulePayload,
	fetchImpl: typeof fetch = fetch
): Promise<PushResult<ScheduleReceipt>> {
	return request(
		fetchImpl,
		'/v1/schedules',
		{
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ subscription, ...payload })
		},
		(res) => res.json() as Promise<ScheduleReceipt>
	);
}

export function deleteSchedule(
	endpoint: string,
	fetchImpl: typeof fetch = fetch
): Promise<PushResult<void>> {
	return request(
		fetchImpl,
		`/v1/schedules?endpoint=${encodeURIComponent(endpoint)}`,
		{ method: 'DELETE' },
		async () => undefined
	);
}
