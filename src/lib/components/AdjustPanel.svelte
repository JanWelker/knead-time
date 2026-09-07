<script lang="ts">
	import { formatDateTime, formatDuration, formatGrams } from '$lib/format';
	import { i18n } from '$lib/i18n/i18n.svelte';
	import type { FormState } from '$lib/state.svelte';
	import InputForm from './InputForm.svelte';
	import ModeBadge from './ModeBadge.svelte';

	// The order pad, pulled out over the ticket. Two doors lead here and both
	// land on the same fields: the "Adjust" button in the masthead opens it at
	// the top, and tapping a blank on the plan opens it with that field focused.
	// A power user therefore never walks a wizard — one press and every number
	// in DoughInputs is under the cursor.
	//
	// A native <dialog> rather than a hand-rolled overlay: the focus trap, the
	// inert background and Escape all come for free, and losing any of the three
	// is the usual way a sheet like this goes wrong.
	let { form }: { form: FormState } = $props();

	const t = $derived(i18n.t);
	const locale = $derived(i18n.locale);

	let dialog = $state<HTMLDialogElement | null>(null);

	export function open(fieldId?: string) {
		dialog?.showModal();
		if (!fieldId) return;
		// showModal() focuses the first focusable element; put the reader on the
		// value they actually tapped instead.
		const field = dialog?.querySelector<HTMLElement>(`#${fieldId}`);
		field?.focus();
		field?.scrollIntoView({ block: 'center' });
	}

	// A modal dialog's backdrop clicks land on the dialog element itself; the
	// content fills it edge to edge, so this can only be the backdrop.
	function onBackdrop(event: MouseEvent) {
		if (event.target === dialog) dialog?.close();
	}
</script>

<dialog
	bind:this={dialog}
	onclick={onBackdrop}
	aria-labelledby="adjust-heading"
	class="dialog-panel fixed inset-x-0 top-auto bottom-0 m-0 h-[88dvh] max-h-none w-full max-w-none lg:top-0 lg:right-0 lg:left-auto lg:h-[100dvh] lg:w-[34rem]"
>
	<div class="flex h-full flex-col">
		<!-- The pad's own printed head: the name reversed out of ink, the way out
		     stamped beside it, and under it the three facts this edit is moving.
		     On a phone the ticket is behind the sheet, so without them you would
		     be editing blind. -->
		<div class="border-rule bg-sheet sticky top-0 z-10 border-b-2">
			<div class="card-header justify-between">
				<h2 id="adjust-heading" class="card-header-title">{t.adjust.heading}</h2>
				<button type="button" class="btn-band shrink-0" onclick={() => dialog?.close()}>
					{t.adjust.done}
				</button>
			</div>
			<p class="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5 sm:px-6">
				<span class="label-caps text-ink-soft">{t.adjust.live}</span>
				<span class="data text-ink text-sm">{formatDateTime(form.startAt, locale)}</span>
				<span class="data text-ink text-sm">
					{formatDuration(form.fermentWindowHours * 60, locale)}
				</span>
				<span class="data text-ink text-sm">{formatGrams(form.schedule.ingredients.flour)}</span>
				<ModeBadge mode={form.schedule.mode} />
			</p>
		</div>

		<div class="bg-paper min-h-0 flex-1 overflow-y-auto px-5 py-7 sm:px-6">
			<InputForm {form} />
		</div>
	</div>
</dialog>
