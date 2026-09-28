// Whether this browser can take a push subscription at all, and if not, why —
// pure, so the order of the checks is pinned: in a Safari tab on an iPhone
// PushManager is missing too, and "unsupported" would be the wrong answer.

export type PushSupport = 'needs-install' | 'unsupported' | 'ok';

export interface BrowserFacts {
	userAgent: string;
	platform: string;
	maxTouchPoints: number;
	standalone: boolean;
	hasPush: boolean;
}

// iPadOS reports a Macintosh user agent; the touch points give it away.
export function isAppleTouchDevice(facts: Pick<BrowserFacts, 'userAgent' | 'platform' | 'maxTouchPoints'>): boolean {
	return (
		/iPhone|iPad|iPod/.test(facts.userAgent) ||
		(facts.platform === 'MacIntel' && facts.maxTouchPoints > 1)
	);
}

export function pushSupport(facts: BrowserFacts): PushSupport {
	if (isAppleTouchDevice(facts) && !facts.standalone) return 'needs-install';
	return facts.hasPush ? 'ok' : 'unsupported';
}
