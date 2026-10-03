<script lang="ts">
	import { browser } from '$app/env';
	import { onMount } from 'svelte';

	import { i18n } from '#lib/i18n/i18n.svelte.js';
	import { interpolate } from '#lib/i18n/interpolate.js';
	import { safeLocalStorage } from '#lib/safeStorage.js';
	import {
		deleteSchedule,
		fetchVapidKey,
		putSchedule,
		type PushSubscriptionInfo
	} from '#lib/push/api.js';
	import { applicationServerKey } from '#lib/push/key.js';
	import { buildSchedulePayload } from '#lib/push/reminders.js';
	import {
		clearRemindersFingerprint,
		loadRemindersFingerprint,
		saveRemindersFingerprint
	} from '#lib/push/stored.js';
	import { pushSupport, type PushSupport } from '#lib/push/support.js';
	import type { ComputedSchedule } from '#lib/dough/types.js';
	import type { Locale } from '#lib/i18n/messages.js';

	// Same shape as TrmnlPush: a native <dialog> opened from the actions menu.
	// What the plan needs to know — is this device subscribed, and for which
	// plan — comes back through `onstate`, so the stale notice can render.
	export interface RemindersState {
		subscribed: boolean;
		fingerprint: string | null;
	}

	let {
		schedule,
		fingerprint,
		locale,
		onstate
	}: {
		schedule: ComputedSchedule;
		/** The encoded recipe the plan shows; stored on success, compared for staleness. */
		fingerprint: string;
		locale: Locale;
		onstate: (state: RemindersState) => void;
	} = $props();

	const t = $derived(i18n.t);

	let dialogEl: HTMLDialogElement | null = $state(null);
	let support = $state<PushSupport>('ok');
	// The DOM's NotificationPermission is a type alias, which eslint's no-undef
	// cannot see through in a .svelte script.
	type Permission = 'default' | 'denied' | 'granted';
	let permission = $state<Permission>('default');
	let subscribed = $state(false);
	let status: 'idle' | 'working' | 'set' | 'set-quiet' | 'off' | 'lost' | 'error' = $state('idle');
	let errorMessage = $state('');
	let openedAt = $state(new Date());

	const payload = $derived(buildSchedulePayload(schedule, t, locale, openedAt));
	const nothingAhead = $derived(payload.reminders.length === 0);

	function detect(): void {
		support = pushSupport({
			userAgent: navigator.userAgent,
			platform: navigator.platform,
			maxTouchPoints: navigator.maxTouchPoints,
			standalone: window.matchMedia('(display-mode: standalone)').matches,
			hasPush: 'PushManager' in window && 'Notification' in window && 'serviceWorker' in navigator
		});
		permission = support === 'ok' ? Notification.permission : 'default';
	}

	async function currentSubscription(): Promise<PushSubscription | null> {
		if (support !== 'ok') return null;
		const registration = await navigator.serviceWorker.ready;
		return registration.pushManager.getSubscription();
	}

	function publish(): void {
		onstate({ subscribed, fingerprint: loadRemindersFingerprint(safeLocalStorage()) });
	}

	async function refresh(): Promise<void> {
		const sub = await currentSubscription();
		subscribed = sub !== null;
		// iOS drops the subscription when the icon leaves the Home Screen; the
		// stored fingerprint then describes reminders that no longer exist.
		if (!subscribed && loadRemindersFingerprint(safeLocalStorage()) !== null) {
			clearRemindersFingerprint(safeLocalStorage());
			status = 'lost';
		}
		publish();
	}

	onMount(() => {
		detect();
		void refresh();
	});

	export function open(): void {
		if (!dialogEl) return;
		openedAt = new Date();
		// A dropped subscription was noticed on mount; the dialog is where it is said.
		if (status !== 'lost') status = 'idle';
		errorMessage = '';
		detect();
		void refresh();
		dialogEl.showModal();
	}

	function close(): void {
		dialogEl?.close();
	}

	function fail(reason: string): void {
		status = 'error';
		errorMessage = reason;
	}

	function enable(): void {
		// The permission prompt is the first thing the tap does: WebKit's
		// transient activation does not survive an awaited fetch in between.
		const asked = Notification.requestPermission();
		status = 'working';
		void asked.then(afterPermission, (err) => fail(String(err)));
	}

	async function afterPermission(granted: Permission): Promise<void> {
		permission = granted;
		if (granted !== 'granted') return fail(t.reminders.error_permission);
		const registration = await navigator.serviceWorker.ready;
		let sub = await registration.pushManager.getSubscription();
		if (!sub) {
			const key = await fetchVapidKey();
			if (!key.ok) return fail(key.message);
			try {
				sub = await registration.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey: applicationServerKey(key.value)
				});
			} catch (err) {
				return fail(err instanceof Error ? err.message : String(err));
			}
		}
		const result = await putSchedule(sub.toJSON() as PushSubscriptionInfo, payload);
		if (!result.ok) {
			// 410: the push service refused this subscription; the browser's copy is dead too.
			if (result.status === 410) await sub.unsubscribe();
			subscribed = result.status !== 410;
			publish();
			return fail(result.message);
		}
		if (browser) saveRemindersFingerprint(safeLocalStorage(), fingerprint);
		subscribed = true;
		status = result.value.receipt ? 'set' : 'set-quiet';
		publish();
	}

	async function disable(): Promise<void> {
		status = 'working';
		const sub = await currentSubscription();
		if (sub) {
			await deleteSchedule(sub.endpoint);
			await sub.unsubscribe();
		}
		clearRemindersFingerprint(safeLocalStorage());
		subscribed = false;
		status = 'off';
		publish();
	}

	const blocked = $derived(support !== 'ok' || permission === 'denied' || nothingAhead);
</script>

<dialog bind:this={dialogEl} aria-labelledby="reminders-heading" class="dialog-panel max-w-md">
	<div class="space-y-4 p-5">
		<header class="space-y-1">
			<h2 id="reminders-heading" class="banner">{t.reminders.dialog_heading}</h2>
			<p class="text-ink-soft text-xs">{t.reminders.dialog_intro}</p>
		</header>

		{#if support === 'needs-install'}
			<p class="notice notice-info">{t.reminders.needs_install}</p>
		{:else if support === 'unsupported'}
			<p class="notice notice-info">{t.reminders.unsupported}</p>
		{:else if permission === 'denied'}
			<p class="notice notice-info">{t.reminders.denied}</p>
		{:else}
			<p class="data text-base" data-testid="reminders-summary">{payload.receipt.body}</p>
		{/if}

		<div class="flex flex-wrap items-center gap-2">
			<button
				type="button"
				class="btn-tomato"
				disabled={blocked || status === 'working'}
				onclick={enable}
			>
				{status === 'working'
					? t.reminders.working
					: subscribed
						? t.reminders.update
						: t.reminders.set}
			</button>
			{#if subscribed}
				<button type="button" class="btn-ghost" disabled={status === 'working'} onclick={disable}>
					{t.reminders.off}
				</button>
			{/if}
			<button type="button" class="btn-quiet ml-auto" onclick={close}>
				{t.reminders.close}
			</button>
		</div>

		<!-- Always in the DOM: a live region created together with its first
		     message is not announced by most screen readers. -->
		<p
			role="status"
			class="text-xs {status === 'set' || status === 'set-quiet' || status === 'off'
				? 'text-herb-ink'
				: status === 'error' || status === 'lost'
					? 'text-accent-ink'
					: 'sr-only'}"
		>
			{#if status === 'set'}{t.reminders.done}{:else if status === 'set-quiet'}{t.reminders
					.done_no_receipt}{:else if status === 'off'}{t.reminders
					.off_done}{:else if status === 'lost'}{t.reminders
					.lost}{:else if status === 'error'}{interpolate(t.reminders.error_reason, {
					error: t.reminders.error,
					reason: errorMessage
				})}{/if}
		</p>

		<p class="border-rule text-ink-soft border-t-2 pt-3 text-xs">
			{t.reminders.privacy}
			<a
				href="https://github.com/JanWelker/knead-time/blob/main/docs/reminders.md"
				target="_blank"
				rel="noopener noreferrer"
				class="link-quiet"
			>
				{t.reminders.guide}
			</a>
		</p>
	</div>
</dialog>
