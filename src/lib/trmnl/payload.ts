import type { ComputedSchedule, DoughInputs } from '../dough/types';
import { currentStepIndex } from '../dough/scheduleStatus';
import {
	formatBallWeight,
	formatDateTime,
	formatDuration,
	formatShortDate,
	formatTime
} from '../format';
import type { Locale, Messages } from '../i18n/messages';
import { stepDescription, stepTitle } from '../stepCopy';

// Pre-formatted display data for the TRMNL view. Pre-formatting lets the
// inline-decoder script in the prerendered HTML do nothing but JSON.parse +
// textContent assignment — no need to inline computeSchedule, the i18n
// catalog, or Intl formatters into the TRMNL HTML. The main app computes &
// formats; TRMNL renders.
export interface TrmnlPayload {
	title: string;
	summary: string;
	readyLabel: string;
	readyTime: string;
	featured: TrmnlFeaturedPanel | null;
	steps: TrmnlPayloadStep[];
	doneLabel: string;
}

export interface TrmnlFeaturedPanel {
	label: string;
	title: string;
	timeRange: string;
	description: string;
	isDone: boolean;
}

export interface TrmnlPayloadStep {
	title: string;
	date: string;
	time: string;
	duration: string;
	isReady: boolean;
	// ISO so the inline-decoder can recompute current-step at TRMNL capture time
	// without re-parsing a localized date string.
	atIso: string;
}

export function buildTrmnlPayload(
	inputs: DoughInputs,
	schedule: ComputedSchedule,
	msgs: Messages,
	locale: Locale,
	now: Date
): TrmnlPayload {
	const yeastLabel =
		inputs.yeastType === 'fresh' ? msgs.form.yeast_fresh : msgs.form.yeast_sourdough;
	const preFermentLabel =
		inputs.preFerment?.type === 'biga'
			? msgs.form.preFerment_biga
			: inputs.preFerment?.type === 'poolish'
				? msgs.form.preFerment_poolish
				: null;
	const modeLabel = schedule.mode === 'cold' ? msgs.mode.cold : msgs.mode.room;

	const summary =
		`${inputs.pizzaCount} × ${formatBallWeight(inputs.ballWeight)} g · ${inputs.hydration}% · ${yeastLabel}` +
		(preFermentLabel ? ` · ${preFermentLabel}` : '') +
		` · ${modeLabel}`;

	const idx = currentStepIndex(schedule.steps, now);
	const last = schedule.steps.length - 1;

	let featured: TrmnlFeaturedPanel | null = null;
	if (schedule.steps.length > 0) {
		if (idx === last) {
			featured = {
				label: msgs.trmnl.done,
				title: stepTitle(schedule.steps[last], msgs),
				timeRange: '',
				description: '',
				isDone: true
			};
		} else {
			const focusIdx = idx >= 0 ? idx : 0;
			const step = schedule.steps[focusIdx];
			const endsAt = new Date(step.at.getTime() + step.durationMinutes * 60_000);
			const timeRange =
				`${formatTime(step.at, locale)} - ${formatTime(endsAt, locale)}` +
				` (${formatDuration(step.durationMinutes, locale)})`;
			featured = {
				label: idx >= 0 ? msgs.trmnl.now : msgs.trmnl.next,
				title: stepTitle(step, msgs),
				timeRange,
				description: stepDescription(step, msgs, schedule),
				isDone: false
			};
		}
	}

	return {
		title: msgs.app.title,
		summary,
		readyLabel: msgs.form.readyBy,
		readyTime: formatDateTime(inputs.readyBy, locale).replace(/,/g, ''),
		featured,
		doneLabel: msgs.trmnl.done,
		steps: schedule.steps.map((step) => ({
			title: stepTitle(step, msgs),
			date: formatShortDate(step.at, locale),
			time: formatTime(step.at, locale),
			duration: step.durationMinutes > 0 ? formatDuration(step.durationMinutes, locale) : '—',
			isReady: step.kind === 'ready',
			atIso: step.at.toISOString()
		}))
	};
}

// Unicode-safe base64 — btoa()/atob() only handle latin1; round-tripping
// through utf-8 first preserves the localized strings. Node 22+ and every
// supported browser expose btoa/atob globally, so no Buffer fallback.
function utf8ToBase64(text: string): string {
	const bytes = new TextEncoder().encode(text);
	let bin = '';
	for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
	return btoa(bin);
}

function base64ToUtf8(b64: string): string {
	const bin = atob(b64);
	const bytes = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
	return new TextDecoder().decode(bytes);
}

export function encodeTrmnlPayload(payload: TrmnlPayload): string {
	return utf8ToBase64(JSON.stringify(payload));
}

export function decodeTrmnlPayload(encoded: string): TrmnlPayload | null {
	try {
		const json = base64ToUtf8(encoded);
		return JSON.parse(json) as TrmnlPayload;
	} catch {
		return null;
	}
}
