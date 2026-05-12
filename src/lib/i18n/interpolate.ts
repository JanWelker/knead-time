export function interpolate(template: string, vars: Record<string, string | number>): string {
	return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}
