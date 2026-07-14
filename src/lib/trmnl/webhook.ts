import type { ComputedSchedule, DoughInputs } from '../dough/types';
import {
	formatBallWeight,
	formatDateTime,
	formatDuration,
	formatShortDate,
	formatTime
} from '../format';
import type { Locale, Messages } from '../i18n/messages';
import { stepTitle } from '../stepCopy';

// TRMNL Private Plugin webhooks live at this hostname; only the UUID at
// the end varies between users. Confirmed CORS-open: the endpoint replies
// with `Access-Control-Allow-Origin: *` so a browser-side POST from
// Knead Time lands without preflight rejection.
export const TRMNL_WEBHOOK_BASE = 'https://trmnl.com/api/custom_plugins/';

// TRMNL's free tier caps webhook payloads at 2 KB. A cold-mode recipe with
// a pre-ferment and seven localized step descriptions blows past 2 KB with
// human-readable JSON keys. Short keys trade verbosity for ~600 bytes of
// headroom; the Liquid template uses the same names. Mapping documented
// in docs/trmnl-setup.md.
//
//   t  = title                 s  = summary
//   rl = ready label           rt = ready time (formatted, no commas)
//   l  = labels container     l.n  = "Now"   l.x = "Next"   l.d = "Done"
//                             l.sn = "since" (prefix for in-progress panel)
//                             l.lf = "left"  (suffix for remaining time)
//                             l.uh = "h"     l.um = "min" (remaining-time units)
//   st = steps                  ↳ step.t   = title
//                               ↳ step.dt  = date
//                               ↳ step.tm  = time
//                               ↳ step.dr  = duration ("15 min" or "—")
//                               ↳ step.u   = at_unix (seconds since epoch)
//                               ↳ step.du  = duration_seconds — numeric, so the
//                                            Liquid Now panel can compute
//                                            "remaining = u + du − now"
//                               ↳ step.r   = is_ready flag for the bake row
// Step descriptions (the long, interpolated paragraph shown in the web app)
// are intentionally NOT in the payload. The default Full-Markup template
// renders only titles + times + durations, and including descriptions
// blew past the 2 KB cap in de/it/fr (each long German description costs
// ~80 bytes × 8 steps).
export interface TrmnlMergeVariables {
	t: string;
	s: string;
	rl: string;
	rt: string;
	l: {
		n: string;
		x: string;
		d: string;
		sn: string;
		lf: string;
		uh: string;
		um: string;
	};
	st: TrmnlMergeStep[];
}

export interface TrmnlMergeStep {
	t: string;
	dt: string;
	tm: string;
	dr: string;
	u: number;
	du: number;
	r: boolean;
}

export function buildMergeVariables(
	inputs: DoughInputs,
	schedule: ComputedSchedule,
	msgs: Messages,
	locale: Locale
): TrmnlMergeVariables {
	const YEAST_LABEL_KEYS = {
		fresh: 'yeast_fresh',
		instant: 'yeast_instant',
		'active-dry': 'yeast_active_dry',
		sourdough: 'yeast_sourdough'
	} as const;
	const yeastLabel = msgs.form[YEAST_LABEL_KEYS[inputs.yeastType]];
	const preFermentLabel =
		inputs.preFerments.length > 0
			? inputs.preFerments
					.map((pf) =>
						// "Biga (stiff, ~50% hydration)" → "Biga"; the parenthetical
						// blows the 2 KB payload budget for no e-ink value.
						(pf.type === 'biga' ? msgs.form.preFerment_biga : msgs.form.preFerment_poolish)
							.split('(')[0]
							.trim()
					)
					.join(' + ')
			: null;
	const modeLabel = schedule.mode === 'cold' ? msgs.mode.cold : msgs.mode.room;

	const summary =
		`${inputs.pizzaCount} × ${formatBallWeight(inputs.ballWeight)} g · ${inputs.hydration}% · ${yeastLabel}` +
		(preFermentLabel ? ` · ${preFermentLabel}` : '') +
		` · ${modeLabel}`;

	return {
		t: msgs.app.title,
		s: summary,
		rl: msgs.form.readyBy,
		rt: formatDateTime(inputs.readyBy, locale).replace(/,/g, ''),
		l: {
			n: msgs.trmnl.now,
			x: msgs.trmnl.next,
			d: msgs.trmnl.done,
			sn: msgs.trmnl.since,
			lf: msgs.trmnl.left,
			uh: msgs.trmnl.unit_h,
			um: msgs.trmnl.unit_min
		},
		st: schedule.steps.map((step) => ({
			t: stepTitle(step, msgs),
			dt: formatShortDate(step.at, locale),
			tm: formatTime(step.at, locale),
			dr: step.durationMinutes > 0 ? formatDuration(step.durationMinutes, locale) : '—',
			u: Math.floor(step.at.getTime() / 1000),
			du: step.durationMinutes * 60,
			r: step.kind === 'ready'
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
