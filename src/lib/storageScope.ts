// Every device-local key the app writes is `kneadtime:<name>` — and a PR
// preview is served from the production origin. `static/CNAME` puts the live
// site at the root of kneadtime.pizza, and the preview workflow publishes each
// PR under `/pr-preview/pr-<n>/` on the same host, so `localStorage` is one
// bucket for both: a preview build read the maintainer's real saved recipes,
// and a preview carrying a schema change could write a value production could
// not read. The fix is a scope segment derived from the base path the build is
// served from, stamped in at build time (`__STORAGE_SCOPE__` in vite.config.ts)
// so the running page never has to work out where it is.
//
// Pure, so vite.config.ts can import it and the slug rule is testable.

/** `''` at the root; otherwise `:<slug>` of the base path, e.g. `:pr-preview-pr-12`. */
export function storageScopeFor(basePath: string): string {
	const slug = basePath
		.split('/')
		.filter((segment) => segment.length > 0)
		.join('-')
		.replace(/[^A-Za-z0-9_-]+/g, '-');
	return slug ? `:${slug}` : '';
}

/** The storage key for `name` under `scope`: `kneadtime<scope>:<name>`. */
export function scopedStorageKey(name: string, scope: string): string {
	return `kneadtime${scope}:${name}`;
}
