// The VAPID public key travels as base64url text; PushManager wants the raw
// 65-byte P-256 point.
export function applicationServerKey(base64url: string): Uint8Array<ArrayBuffer> {
	const padded = base64url + '='.repeat((4 - (base64url.length % 4)) % 4);
	const binary = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
	const bytes = new Uint8Array(new ArrayBuffer(binary.length));
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}
