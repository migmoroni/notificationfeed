/**
 * Date formatting utilities using Intl.RelativeTimeFormat.
 *
 * Zero external dependencies — leverages the browser's built-in
 * internationalization API with locale from i18n store.
 */

import { currentLanguage } from '$lib/i18n/store.svelte.js';

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

// Cache formatters per locale to avoid re-creating on every call
let cachedLocale = '';
let rtf: Intl.RelativeTimeFormat;
let shortDateFmt: Intl.DateTimeFormat;
let fullDateFmt: Intl.DateTimeFormat;

function getFormatters() {
	const locale = currentLanguage();
	if (locale !== cachedLocale) {
		cachedLocale = locale;
		rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
		shortDateFmt = new Intl.DateTimeFormat(locale, {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
		fullDateFmt = new Intl.DateTimeFormat(locale, {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
	return { rtf, shortDateFmt, fullDateFmt };
}

/**
 * Format a date as a relative time string (e.g., "há 2 horas", "há 3 dias").
 * Falls back to a short date for anything older than 4 weeks.
 */
export function formatRelativeDate(date: Date | string): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	const now = Date.now();
	const diffSec = Math.round((d.getTime() - now) / 1000);
	const absDiff = Math.abs(diffSec);
	const { rtf } = getFormatters();

	if (absDiff < MINUTE) return rtf.format(diffSec, 'second');
	if (absDiff < HOUR) return rtf.format(Math.round(diffSec / MINUTE), 'minute');
	if (absDiff < DAY) return rtf.format(Math.round(diffSec / HOUR), 'hour');
	if (absDiff < WEEK) return rtf.format(Math.round(diffSec / DAY), 'day');
	if (absDiff < MONTH) return rtf.format(Math.round(diffSec / WEEK), 'week');

	// Older than ~4 weeks: show short date
	return formatShortDate(d);
}

/**
 * Format a date as a short string (e.g., "16 de fev." or "16 de fev. de 2025").
 * Includes year only if it differs from the current year.
 */
export function formatShortDate(date: Date | string): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	const currentYear = new Date().getFullYear();
	const { shortDateFmt, fullDateFmt } = getFormatters();

	if (d.getFullYear() === currentYear) {
		return shortDateFmt.format(d);
	}
	return fullDateFmt.format(d);
}
