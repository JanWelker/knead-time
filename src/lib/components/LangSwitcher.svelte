<script lang="ts">
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { LOCALES, type Locale } from '$lib/i18n/messages';
	import SegmentedControl from './SegmentedControl.svelte';

	const labels: Record<Locale, string> = {
		en: 'EN',
		de: 'DE',
		it: 'IT',
		fr: 'FR',
		nl: 'NL'
	};
</script>

<SegmentedControl
	legend={i18n.t.app.langLabel}
	options={LOCALES}
	active={i18n.locale}
	onselect={(loc) => i18n.set(loc)}
	labelFor={(loc) => labels[loc]}
/>
