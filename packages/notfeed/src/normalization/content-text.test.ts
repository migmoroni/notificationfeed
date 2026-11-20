import { describe, expect, it } from 'vitest';
import { htmlToPlainText } from './content-text.js';

describe('htmlToPlainText', () => {
	it('strips feed markup and decodes entities', () => {
		expect(htmlToPlainText('<p><strong>Microsoft</strong> &amp; Windows<br>updates</p>')).toBe('Microsoft & Windows updates');
	});

	it('handles escaped markup from JSON and RSS payloads', () => {
		expect(htmlToPlainText('&lt;p&gt;Hello&nbsp;<em>reader</em>&lt;/p&gt;')).toBe('Hello reader');
	});

	it('does not eat plain less-than comparisons', () => {
		expect(htmlToPlainText('1 < 2 &amp; 3 > 2')).toBe('1 < 2 & 3 > 2');
	});

	it('decodes common accented named entities', () => {
		expect(htmlToPlainText('Seguran&ccedil;a e atualiza&ccedil;&otilde;es')).toBe('Seguran\u00e7a e atualiza\u00e7\u00f5es');
	});
});
