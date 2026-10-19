<script lang="ts">
	import { resolve } from '$app/paths';

	import { i18n } from '#lib/i18n/i18n.svelte.js';
	import { forgetSubscription } from '#lib/push/api.js';
	import { resetDeviceStorage } from '#lib/resetDevice.js';
	import { safeLocalStorage } from '#lib/safeStorage.js';

	// "Reset this device" (issue #469): a native <dialog> opened from the
	// masthead menu, like SaveRecipeDialog from the plan's. It holds no <form>,
	// so the browser suite's `sheet()` (an open dialog with a form) never
	// mistakes it for the recipe sheet.

	const t = $derived(i18n.t);

	let dialogEl: HTMLDialogElement | null = $state(null);
	let working = $state(false);

	export function open(): void {
		if (!dialogEl) return;
		working = false;
		dialogEl.showModal();
	}

	function close(): void {
		dialogEl?.close();
	}

	// The subscription the browser holds, if any. `getRegistration()` rather
	// than `ready`: `ready` never settles where no worker was ever registered,
	// and a reset must not hang on a device that never asked for reminders.
	async function currentSubscription(): Promise<PushSubscription | null> {
		try {
			if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
			const registration = await navigator.serviceWorker.getRegistration();
			return (await registration?.pushManager.getSubscription()) ?? null;
		} catch {
			return null;
		}
	}

	async function reset(): Promise<void> {
		working = true;
		// The only request a reset makes, and only when this device is
		// subscribed: clearing the stored fingerprint alone would leave the
		// service holding the schedule, and it would keep sending.
		const subscription = await currentSubscription();
		if (subscription) await forgetSubscription(subscription);
		resetDeviceStorage(safeLocalStorage());
		// A bare URL, under the base: no recipe in the query and no view in the
		// fragment, so the next load resolves everything from its defaults.
		window.location.replace(resolve('/'));
	}
</script>

<dialog bind:this={dialogEl} aria-labelledby="reset-device-heading" class="dialog-panel max-w-md">
	<div class="space-y-4 p-5">
		<!-- A <div>, not a <header>: on the plan and in the library the menu sits
		     inside <main>, and e2e/landmarks.spec.ts holds main free of headers. -->
		<div class="space-y-1">
			<h2 id="reset-device-heading" class="banner">{t.reset.heading}</h2>
			<p class="text-ink-soft text-xs">{t.reset.intro}</p>
		</div>

		<div class="space-y-1 text-sm">
			<p class="label-caps">{t.reset.goes}</p>
			<ul class="list-disc space-y-0.5 pl-5" data-testid="reset-list">
				<li>{t.reset.item_recipe}</li>
				<li>{t.reset.item_reminders}</li>
				<li>{t.reset.item_view}</li>
				<li>{t.reset.item_verbosity}</li>
				<li>{t.reset.item_theme}</li>
				<li>{t.reset.item_language}</li>
			</ul>
		</div>

		<p class="notice notice-info">{t.reset.kept}</p>
		<p class="text-ink-soft text-xs">{t.reset.permission}</p>

		<div class="flex flex-wrap items-center gap-2">
			<button type="button" class="btn-tomato" disabled={working} onclick={reset}>
				{working ? t.reset.working : t.reset.confirm}
			</button>
			<button type="button" class="btn-quiet ml-auto" disabled={working} onclick={close}>
				{t.actions.cancel}
			</button>
		</div>
	</div>
</dialog>
