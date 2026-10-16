import encodeQR from 'qr';

export interface QrCode {
	/** Module count per side. The SVG that renders this should use the same value as its viewBox. */
	size: number;
	/** Combined SVG `d` attribute for every dark module — one `<path>` paints the whole code. */
	path: string;
}

// `qr` does the hard part (Reed-Solomon, version pick, mask scoring). We
// collapse its module grid into a single SVG path so the caller can drop it
// into a `<path d={…}>` element — no `{@html}` needed and only one DOM node
// regardless of QR version.
// Error correction level 'M' (~15 % recovery) is plenty for a printed
// share URL; higher levels just inflate the matrix.
// `qr` refuses a zero-width quiet zone, so we ask for the narrowest one and
// slice that ring off: the white of the sheet around the SVG is the quiet zone.
export function qrCode(content: string): QrCode {
	const grid = encodeQR(content, 'raw', { ecc: 'medium', border: 1 });
	const size = grid.length - 2;
	const parts: string[] = [];
	for (let r = 0; r < size; r++) {
		for (let c = 0; c < size; c++) {
			if (grid[r + 1][c + 1]) {
				parts.push(`M${c},${r}h1v1h-1z`);
			}
		}
	}
	return { size, path: parts.join('') };
}
