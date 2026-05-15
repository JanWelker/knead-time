import type { ComputedSchedule, DoughInputs } from '../dough/types';
import {
	formatBallWeight,
	formatDateTime,
	formatDuration,
	formatShortDate,
	formatTime
} from '../format';
import type { Locale, Messages } from '../i18n/messages';
import { stepDescription, stepTitle } from '../stepCopy';

// TRMNL Private Plugin webhooks live at this hostname; only the UUID at
// the end varies between users. Confirmed CORS-open: the endpoint replies
// with `Access-Control-Allow-Origin: *` so a browser-side POST from
// doughcalc lands without preflight rejection.
export const TRMNL_WEBHOOK_BASE = 'https://trmnl.com/api/custom_plugins/';

// The shape we POST as `merge_variables`. Every value is pre-formatted on
// our side so the user's Liquid template stays minimal — render text,
// build the schedule table, branch on `is_ready`. The only computation
// the template needs to do is "what step is current" via `at_unix`
// vs. `"now" | date: "%s"`.
export interface TrmnlMergeVariables {
	title: string;
	summary: string;
	ready_label: string;
	ready_time: string;
	ready_time_unix: number;
	steps: TrmnlMergeStep[];
	labels: {
		now: string;
		next: string;
		done: string;
	};
	generated_at: string;
	locale: string;
}

export interface TrmnlMergeStep {
	title: string;
	description: string;
	date: string;
	time: string;
	duration: string;
	duration_minutes: number;
	at_unix: number;
	is_ready: boolean;
}

export function buildMergeVariables(
	inputs: DoughInputs,
	schedule: ComputedSchedule,
	msgs: Messages,
	locale: Locale,
	now: Date
): TrmnlMergeVariables {
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

	return {
		title: msgs.app.title,
		summary,
		ready_label: msgs.form.readyBy,
		ready_time: formatDateTime(inputs.readyBy, locale).replace(/,/g, ''),
		ready_time_unix: Math.floor(inputs.readyBy.getTime() / 1000),
		labels: {
			now: msgs.trmnl.now,
			next: msgs.trmnl.next,
			done: msgs.trmnl.done
		},
		generated_at: now.toISOString(),
		locale,
		steps: schedule.steps.map((step) => ({
			title: stepTitle(step, msgs),
			description: stepDescription(step, msgs, schedule),
			date: formatShortDate(step.at, locale),
			time: formatTime(step.at, locale),
			duration: step.durationMinutes > 0 ? formatDuration(step.durationMinutes, locale) : '—',
			duration_minutes: step.durationMinutes,
			at_unix: Math.floor(step.at.getTime() / 1000),
			is_ready: step.kind === 'ready'
		}))
	};
}

export interface TrmnlSendOk {
	ok: true;
}

export interface TrmnlSendErr {
	ok: false;
	status: number;
	message: string;
}

export type TrmnlSendResult = TrmnlSendOk | TrmnlSendErr;

// Plugin Setting UUID in the URL is the only auth. TRMNL's free tier
// allows 12 POSTs/h up to 2 KB payload; well within budget for a
// recipe push, and we don't have a use case for higher frequency.
export async function sendToTrmnl(
	uuid: string,
	merge_variables: TrmnlMergeVariables,
	fetchImpl: typeof fetch = fetch
): Promise<TrmnlSendResult> {
	const url = TRMNL_WEBHOOK_BASE + uuid;
	let res: Response;
	try {
		res = await fetchImpl(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ merge_variables })
		});
	} catch (err) {
		return {
			ok: false,
			status: 0,
			message: err instanceof Error ? err.message : String(err)
		};
	}
	if (res.ok) return { ok: true };
	let message = `HTTP ${res.status}`;
	try {
		const body = (await res.json()) as { message?: unknown };
		if (typeof body.message === 'string') message = body.message;
	} catch {
		// non-JSON error body — keep the HTTP status as the message
	}
	return { ok: false, status: res.status, message };
}
