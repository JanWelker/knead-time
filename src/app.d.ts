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

	// What the native iOS shell adds to the page (issue #309). Both are absent
	// in every browser, which is exactly what src/lib/native/bridge.ts checks
	// for. Declared here rather than cast at the call site so the contract with
	// the shell is part of the app's own type surface.
	interface Window {
		webkit?: {
			messageHandlers?: Record<string, { postMessage(body: unknown): void } | undefined>;
		};
		kneadtime?: {
			onState(state: { permission: 'unknown' | 'granted' | 'denied'; pending: number }): void;
		};
	}
}

export {};
