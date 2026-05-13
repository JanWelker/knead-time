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
}

export {};
