import type { ScheduleStepKind } from './types';

// Baker-action steps require the baker to *do* something (preferment-mix,
// prep, mix, divide); passive steps are waiting/fermenting phases. `ready`
// is neither — it's the end marker. The schedule.ts night-window guard
// uses a wider notion of "anchored to wall-clock"; this is specifically
// for UI affordances that flag "is the baker on the clock here?".
export function isActiveStep(kind: ScheduleStepKind): boolean {
	switch (kind) {
		case 'preferment-mix':
		case 'prep':
		case 'mix':
		case 'divide':
			return true;
		case 'bulk-room':
		case 'bulk-cold':
		case 'proof-cold':
		case 'final-proof':
		case 'ready':
			return false;
	}
}
