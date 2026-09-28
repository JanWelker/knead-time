/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, prerendered, version } from '$service-worker';
import { notificationFromPush, openOrFocus, parsePushPayload } from '$lib/push/swHandlers';

const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE = `kneadtime-${version}`;

const DEPLOY_ARTEFACTS = ['/.nojekyll', '/CNAME'];

const PRECACHE = [
	...build,
	...files.filter((file) => !DEPLOY_ARTEFACTS.some((name) => file.endsWith(name))),
	...prerendered
];

const PRECACHED = new Set(PRECACHE);

sw.addEventListener('install', (event) => {
	event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
			)
			// Claim, but never skipWaiting(): a page left open for two days would ask the new worker for the old bundle.
			.then(() => sw.clients.claim())
	);
});

sw.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);
	if (url.origin !== sw.location.origin) return;

	event.respondWith(respond(request, url));
});

async function respond(request: Request, url: URL): Promise<Response> {
	const cache = await caches.open(CACHE);

	const cached = PRECACHED.has(url.pathname) ? await cache.match(url.pathname) : undefined;
	if (cached) return cached;

	try {
		return await fetch(request);
	} catch (offline) {
		const page = await cache.match(url.pathname, { ignoreSearch: true });
		if (page) return page;
		throw offline;
	}
}

// A push is the one thing iOS wakes this worker for, and it is sent by the
// reminder service (push/) only after the user tapped "Remind me". Every push
// shows a notification: iOS revokes a subscription after a few that show none.
sw.addEventListener('push', (event) => {
	const { title, options } = notificationFromPush(
		parsePushPayload(event.data?.text()),
		sw.registration.scope
	);
	event.waitUntil(sw.registration.showNotification(title, options));
});

sw.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const scope = sw.registration.scope;
	const url: string = event.notification.data?.url ?? `${scope}#plan`;
	event.waitUntil(
		sw.clients
			.matchAll({ type: 'window', includeUncontrolled: true })
			.then((windows) => openOrFocus(url, scope, windows, (u) => sw.clients.openWindow(u)))
	);
});

// Deliberately nothing: the schedule lives on the service keyed by the old
// endpoint, and only the page (with the user's tap) can set it up again.
sw.addEventListener('pushsubscriptionchange', () => {});
