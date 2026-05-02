const ENTITY_PATTERN = /&(#\d+|#x[0-9a-f]+|[a-z][a-z0-9]+);/gi;

const NAMED_ENTITIES: Record<string, string> = {
	Aacute: '\u00c1',
	Acirc: '\u00c2',
	Agrave: '\u00c0',
	Aring: '\u00c5',
	Atilde: '\u00c3',
	Auml: '\u00c4',
	Ccedil: '\u00c7',
	Eacute: '\u00c9',
	Ecirc: '\u00ca',
	Egrave: '\u00c8',
	Euml: '\u00cb',
	Iacute: '\u00cd',
	Icirc: '\u00ce',
	Igrave: '\u00cc',
	Iuml: '\u00cf',
	Ntilde: '\u00d1',
	Oacute: '\u00d3',
	Ocirc: '\u00d4',
	Ograve: '\u00d2',
	Oslash: '\u00d8',
	Otilde: '\u00d5',
	Ouml: '\u00d6',
	Uacute: '\u00da',
	Ucirc: '\u00db',
	Ugrave: '\u00d9',
	Uuml: '\u00dc',
	Yacute: '\u00dd',
	aacute: '\u00e1',
	acirc: '\u00e2',
	agrave: '\u00e0',
	amp: '&',
	aring: '\u00e5',
	apos: "'",
	atilde: '\u00e3',
	auml: '\u00e4',
	bull: '*',
	ccedil: '\u00e7',
	eacute: '\u00e9',
	ecirc: '\u00ea',
	egrave: '\u00e8',
	emsp: ' ',
	ensp: ' ',
	euml: '\u00eb',
	gt: '>',
	hellip: '...',
	iacute: '\u00ed',
	icirc: '\u00ee',
	igrave: '\u00ec',
	iuml: '\u00ef',
	laquo: '"',
	ldquo: '"',
	lsquo: "'",
	lt: '<',
	mdash: '-',
	middot: '*',
	nbsp: ' ',
	ndash: '-',
	ntilde: '\u00f1',
	oacute: '\u00f3',
	ocirc: '\u00f4',
	ograve: '\u00f2',
	oslash: '\u00f8',
	otilde: '\u00f5',
	ouml: '\u00f6',
	quot: '"',
	raquo: '"',
	rdquo: '"',
	rsaquo: "'",
	rsquo: "'",
	thinsp: ' ',
	uacute: '\u00fa',
	ucirc: '\u00fb',
	ugrave: '\u00f9',
	uuml: '\u00fc',
	yacute: '\u00fd',
	yuml: '\u00ff'
};

function decodeHtmlEntities(input: string): string {
	return input.replace(ENTITY_PATTERN, (match, entity: string) => {
		const lower = entity.toLowerCase();
		if (lower.startsWith('#x')) {
			const codePoint = Number.parseInt(lower.slice(2), 16);
			return decodeCodePoint(match, codePoint);
		}
		if (lower.startsWith('#')) {
			const codePoint = Number.parseInt(lower.slice(1), 10);
			return decodeCodePoint(match, codePoint);
		}
		return NAMED_ENTITIES[entity] ?? NAMED_ENTITIES[lower] ?? match;
	});
}

function decodeCodePoint(fallback: string, codePoint: number): string {
	if (!Number.isFinite(codePoint) || codePoint <= 0 || codePoint > 0x10ffff) return fallback;
	try {
		return String.fromCodePoint(codePoint);
	} catch {
		return fallback;
	}
}

/** Convert feed HTML snippets into compact plain text for canonical posts. */
export function htmlToPlainText(input: string | null | undefined): string {
	if (!input) return '';

	const decoded = decodeHtmlEntities(input);
	const withoutMarkup = decoded
		.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
		.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
		.replace(/<!--[\s\S]*?-->/g, ' ')
		.replace(/<br\s*\/?>/gi, ' ')
		.replace(/<\/?(?:address|article|aside|blockquote|dd|div|dl|dt|fieldset|figcaption|figure|footer|form|h[1-6]|header|hr|li|main|nav|ol|p|pre|section|table|tbody|td|tfoot|th|thead|tr|ul)\b[^>]*>/gi, ' ')
		.replace(/<\/?[a-z][a-z0-9:-]*(?:\s[^<>]*)?\/?>/gi, ' ');

	return decodeHtmlEntities(withoutMarkup).replace(/\s+/g, ' ').trim();
}
