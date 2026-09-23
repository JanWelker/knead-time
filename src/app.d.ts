// See https://svelte.dev/docs/kit/types#app
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
	// Inlined at build time from package.json#version (see vite.config.ts).
	const __APP_VERSION__: string;
	// Inlined at build time from BASE_PATH (see vite.config.ts and storageScope.ts).
	const __STORAGE_SCOPE__: string;
}

export {};
