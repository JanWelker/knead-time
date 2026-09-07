<script lang="ts">
	import { formatDateTime, formatDuration, formatGrams } from '$lib/format';
	import { i18n } from '$lib/i18n/i18n.svelte';
	import type { FormState } from '$lib/state.svelte';
	import InputForm from './InputForm.svelte';
	import ModeBadge from './ModeBadge.svelte';

	// The editing surface, summoned over the plan. Two doors lead here and both
	// land on the same fields: the "Adjust" button in the plan's masthead opens
	// it at the top, and tapping an underlined value in the plan opens it with
	// that field focused. A power user therefore never walks a wizard — one
	// press and every number in DoughInputs is under the cursor.
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
	class="dialog-panel fixed inset-x-0 top-auto bottom-0 m-0 h-[88dvh] max-h-none w-full max-w-none rounded-b-none lg:top-0 lg:right-0 lg:left-auto lg:h-[100dvh] lg:w-[34rem] lg:rounded-r-none lg:rounded-bl-[1.25rem]"
>
	<div class="flex h-full flex-col">
		<div class="border-line bg-plane sticky top-0 z-10 border-b px-5 py-4 sm:px-7">
			<div class="flex items-start justify-between gap-4">
				<div class="min-w-0">
					<h2 id="adjust-heading" class="font-display text-ink text-xl font-medium">
						{t.adjust.heading}
					</h2>
					<!-- The consequence, in the sheet's own header: on a phone the
					     schedule is behind the sheet, so without this you would be
					     editing blind. It is the same three facts the ask flow's
					     glance shows, for the same reason. -->
					<p class="text-ink-soft mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
						<span>{t.adjust.live}</span>
						<span class="data text-ink">{formatDateTime(form.startAt, locale)}</span>
						<span class="data text-ink">
							{formatDuration(form.fermentWindowHours * 60, locale)}
						</span>
						<span class="data text-ink">{formatGrams(form.schedule.ingredients.flour)}</span>
						<ModeBadge mode={form.schedule.mode} blurb={false} />
					</p>
				</div>
				<button type="button" class="btn-tomato shrink-0" onclick={() => dialog?.close()}>
					{t.adjust.done}
				</button>
			</div>
		</div>

		<div class="min-h-0 flex-1 overflow-y-auto px-5 py-7 sm:px-7">
			<InputForm {form} />
		</div>
	</div>
</dialog>
