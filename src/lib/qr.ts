import qrcode from 'qrcode-generator';

export interface QrCode {
	/** Module count per side. The SVG that renders this should use the same value as its viewBox. */
	size: number;
	/** Combined SVG `d` attribute for every dark module — one `<path>` paints the whole code. */
	path: string;
}

// `qrcode-generator` does the hard part (Reed-Solomon, version pick, mask
// scoring). We collapse its module grid into a single SVG path so the
// caller can drop it into a `<path d={…}>` element — no `{@html}` needed
// and only one DOM node regardless of QR version.
// Error correction level 'M' (~15 % recovery) is plenty for a printed
// share URL; higher levels just inflate the matrix.
export function qrCode(content: string): QrCode {
	const qr = qrcode(0, 'M');
	qr.addData(content);
	qr.make();
	const size = qr.getModuleCount();
	const parts: string[] = [];
	for (let r = 0; r < size; r++) {
		for (let c = 0; c < size; c++) {
			if (qr.isDark(r, c)) {
				parts.push(`M${c},${r}h1v1h-1z`);
			}
		}
	}
	return { size, path: parts.join('') };
}
