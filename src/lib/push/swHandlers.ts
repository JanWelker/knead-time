// The service worker's push logic, kept out of service-worker.ts so it can be
// unit-tested: that file imports `$service-worker`, which vitest cannot resolve.
// Typed against the shapes it needs rather than lib.webworker, which svelte-check
// does not have for src/lib.

export interface PushPayload {
	title: string;
	body: string;
	tag: string;
}

// iOS revokes a subscription after a few pushes that show nothing, so an
// unreadable payload still has to become a notification.
const FALLBACK: PushPayload = { title: 'Knead Time', body: '', tag: 'unknown' };

export function parsePushPayload(text: string | null | undefined): PushPayload {
	if (!text) return FALLBACK;
	try {
		const parsed: unknown = JSON.parse(text);
		if (typeof parsed !== 'object' || parsed === null) return FALLBACK;
		const p = parsed as Record<string, unknown>;
		if (typeof p.title !== 'string' || !p.title) return FALLBACK;
		return {
			title: p.title,
			body: typeof p.body === 'string' ? p.body : '',
			tag: typeof p.tag === 'string' && p.tag ? p.tag : FALLBACK.tag
		};
	} catch {
		return FALLBACK;
	}
}

export interface NotificationSpec {
	title: string;
	options: { body: string; tag: string; icon: string; data: { url: string } };
}

// Every URL hangs off the registration scope, not the worker's own location:
// a preview's worker is scoped to /pr-preview/pr-N/, and iOS refuses to open a
// window outside the scope.
export function notificationFromPush(payload: PushPayload, scope: string): NotificationSpec {
	return {
		title: payload.title,
		options: {
			body: payload.body,
			tag: payload.tag,
			icon: new URL('icon-192.png', scope).href,
			data: { url: `${scope}#plan` }
		}
	};
}

export interface WindowLike {
	url: string;
	focus(): Promise<unknown>;
}

/** Bring an open copy of the app to the front, or open one. */
export async function openOrFocus(
	url: string,
	scope: string,
	windows: WindowLike[],
	openWindow: (url: string) => Promise<unknown>
): Promise<void> {
	const open = windows.find((w) => w.url.startsWith(scope));
	if (open) {
		await open.focus();
		return;
	}
	await openWindow(url);
}
