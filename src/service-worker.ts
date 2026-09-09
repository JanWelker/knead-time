/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, prerendered, version } from '$service-worker';

// Added to a home screen, this stops being a page and becomes the job ticket
// you live inside for two days — in a kitchen, on a phone whose signal is
// whatever the building allows. So it has to open with no network at all.
//
// That is cheap here, and for the same reason the one-origin contract exists:
// the app fetches nothing from anywhere. No backend, no analytics, no CDN, no
// font server. "The whole app" is therefore a finite list of files known at
// build time, and offline is a precache rather than a strategy — install takes
// all of it, and after that the network is only ever asked about a newer
// version.
//
// There is deliberately no push handler. iOS wakes a service worker for
// exactly one thing, an incoming push message, which needs a server to send
// it; a step reminder at 03:00 is therefore not reachable from a client-side
// app, whatever the manifest says. See issue #306 and the note in app.html.
//
// That has not changed, and the native iOS shell (ios/, issue #309) is not an
// exception to it: the shell does not run this file at all. WKWebView registers
// no service worker for the custom scheme the bundle is served from, and would
// have nothing to precache if it did — the whole app is already on the device.
// Its reminders come from UNUserNotificationCenter, not from here.
//
// SvelteKit registers this file itself (`kit.serviceWorker.register` defaults
// to true) — there is no registration call anywhere in the app.

const sw = self as unknown as ServiceWorkerGlobalScope;

// `version` changes every build, so each deploy gets its own cache and activate
// drops the previous one whole. Nothing is ever revalidated within a version.
const CACHE = `kneadtime-${version}`;

// Two files in static/ are instructions to GitHub Pages rather than assets the
// app ever asks for, and precaching them is not merely pointless: `addAll` is
// all-or-nothing by design — either the whole app is offline or none of it is,
// never half — so one unfetchable entry silently costs the entire precache.
// `.nojekyll` is exactly that, because `vite preview`, which the browser suite
// builds and serves the real output with, refuses to serve dotfiles at all.
const DEPLOY_ARTEFACTS = ['/.nojekyll', '/CNAME'];

const PRECACHE = [
	...build, // the single content-hashed bundle, its stylesheet, the two faces
	...files.filter((file) => !DEPLOY_ARTEFACTS.some((name) => file.endsWith(name))), // static/
	...prerendered // '/' and the print sheet, one file per locale
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
			// Claim, but never skipWaiting. Claiming is what makes the first visit
			// work offline — without it the worker installs and controls nothing
			// until the next load. Skipping the wait would swap the worker under a
			// page that is already open, and this is an app people leave open for
			// two days: the running page would then ask the new worker for the old
			// bundle's hashed filename, which the new cache does not have and the
			// deploy has already deleted from the server. Waiting for the tabs to
			// close costs one late update and cannot break a bake in progress.
			.then(() => sw.clients.claim())
	);
});

sw.addEventListener('fetch', (event) => {
	const { request } = event;
	// The one outbound call the app makes is the TRMNL webhook: a cross-origin
	// POST to a URL the user typed. Both halves of it are excluded here, and a
	// cache must never stand between a user and their own device.
	if (request.method !== 'GET') return;

	const url = new URL(request.url);
	if (url.origin !== sw.location.origin) return;

	event.respondWith(respond(request, url));
});

async function respond(request: Request, url: URL): Promise<Response> {
	const cache = await caches.open(CACHE);

	// Everything precached is immutable under the name it is asked for — the
	// bundle and the stylesheet carry a content hash, and a new deploy arrives
	// as a whole new cache — so these are answered from disk without asking the
	// network. That includes the page itself, which is what makes the app paint
	// instantly on the counter; a deploy shows up on the load after next.
	const cached = PRECACHED.has(url.pathname) ? await cache.match(url.pathname) : undefined;
	if (cached) return cached;

	try {
		return await fetch(request);
	} catch (offline) {
		// A share link opened cold with no network: '/?v=7&n=6…' is not a URL
		// anything precached, but the recipe lives entirely in the query and one
		// document renders every recipe there is, so the prerendered page for
		// that path is the right answer. `ignoreSearch` is what finds it.
		const page = await cache.match(url.pathname, { ignoreSearch: true });
		if (page) return page;
		throw offline;
	}
}
