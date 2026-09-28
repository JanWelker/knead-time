import { describe, expect, it } from 'vitest';
import { stripTemplateComments } from './templateComments';

describe('stripTemplateComments', () => {
	it('removes a prose comment and the line break it stood on', () => {
		expect(stripTemplateComments('<head>\n<!-- a note -->\n<meta />')).toBe('<head>\n<meta />');
	});

	it('removes a multi-line prose comment', () => {
		const html = '<!-- One mark, one file:\n     the tab and the Home Screen -->\n<link />';
		expect(stripTemplateComments(html)).toBe('<link />');
	});

	// The page cannot hydrate without these: Svelte walks them to find where
	// each block starts and ends, and the head anchor tells it what to keep.
	it('keeps every hydration marker Svelte emits', () => {
		const html = '<!--1hugt37--><div><!--[--><!--[0-->x<!--]--><!--[!-->y<!--]--><!----></div>';
		expect(stripTemplateComments(html)).toBe(html);
	});

	it('removes each prose comment on its own, never the markup between two', () => {
		const html = '<!-- first -->\n<a></a>\n<!-- second -->\n<b></b>';
		expect(stripTemplateComments(html)).toBe('<a></a>\n<b></b>');
	});
});
