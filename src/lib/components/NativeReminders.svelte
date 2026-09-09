<script lang="ts">
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { interpolate } from '$lib/i18n/interpolate';
	import { nativeHost } from '$lib/native/host.svelte';

	const t = $derived(i18n.t);

	let dialogEl: HTMLDialogElement | null = $state(null);
	// 'asking' is ours, not the OS's: the iOS prompt is modal and the answer
	// arrives through the bridge, so the button has to say something in between.
	let asking = $state(false);

	export function open(): void {
		if (!dialogEl) return;
		asking = false;
		dialogEl.showModal();
	}

	function close(): void {
		dialogEl?.close();
	}

	// iOS gives an app exactly one chance to prompt, ever, so this is only
	// reachable from a press inside a dialog the baker opened on purpose —
	// never on launch, and never as a side effect of anything else.
	function turnOn(): void {
		if (nativeHost.permission === 'granted') {
			nativeHost.setEnabled(true);
			return;
		}
		asking = true;
		nativeHost.request();
	}

	function turnOff(): void {
		asking = false;
		nativeHost.setEnabled(false);
	}

	// The prompt has been answered once the shell reports anything but 'unknown'.
	$effect(() => {
		if (asking && nativeHost.permission !== 'unknown') {
			asking = false;
			if (nativeHost.permission === 'granted') nativeHost.setEnabled(true);
		}
	});

	const on = $derived(nativeHost.enabled && nativeHost.permission === 'granted');
	const denied = $derived(nativeHost.permission === 'denied');
</script>

<!-- aria-labelledby: a <dialog> with no accessible name is announced as just
     "dialog", and this one already has the heading to use. -->
<dialog bind:this={dialogEl} aria-labelledby="reminders-heading" class="dialog-panel max-w-md">
	<div class="space-y-4 p-5">
		<header class="space-y-1">
			<h2 id="reminders-heading" class="banner">{t.reminders.dialog_heading}</h2>
			<p class="text-ink-soft text-xs">{t.reminders.dialog_intro}</p>
		</header>

		<!-- The night rule stated before it happens: a reminder that arrives
		     silently at 23:40 reads as broken unless the app said it would. -->
		<p class="border-rule text-ink-soft border-l-2 pl-3 text-xs">{t.reminders.night_note}</p>

		<div class="flex flex-wrap items-center gap-2">
			{#if on}
				<button type="button" class="btn-ghost" onclick={turnOff}>{t.reminders.disable}</button>
			{:else}
				<button type="button" class="btn-tomato" disabled={asking || denied} onclick={turnOn}>
					{asking ? t.reminders.asking : t.reminders.enable}
				</button>
			{/if}
			<button type="button" class="btn-quiet ml-auto" onclick={close}>{t.reminders.close}</button>
		</div>

		<!-- Present from the start and empty while idle, because a region that
		     appears with its first message is not announced at all. Says the
		     count rather than just "on": a reminder feature you cannot verify is
		     one you end up not trusting at 04:00. -->
		<p
			role="status"
			class="text-xs {on ? 'text-herb-ink' : denied ? 'text-accent-ink' : 'sr-only'}"
		>
			{#if on}
				{nativeHost.pending > 0
					? interpolate(t.reminders.on_count, { n: nativeHost.pending })
					: t.reminders.on}
			{:else if denied}
				{t.reminders.denied} {t.reminders.denied_hint}
			{/if}
		</p>
	</div>
</dialog>
