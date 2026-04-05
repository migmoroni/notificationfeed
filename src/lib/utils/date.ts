/**
 * Date formatting utilities using Intl.RelativeTimeFormat.
 *
 * Zero external dependencies — leverages the browser's built-in
 * internationalization API with 'pt-BR' locale.
 */

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });

const shortDateFmt = new Intl.DateTimeFormat('pt-BR', {
	day: 'numeric',
	month: 'short',
	hour: '2-digit',
	minute: '2-digit'
});

const fullDateFmt = new Intl.DateTimeFormat('pt-BR', {
	day: 'numeric',
	month: 'short',
	year: 'numeric',
	hour: '2-digit',
	minute: '2-digit'
});

/**
 * Format a date as a relative time string (e.g., "há 2 horas", "há 3 dias").
 * Falls back to a short date for anything older than 4 weeks.
 */
export function formatRelativeDate(date: Date | string): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	const now = Date.now();
	const diffSec = Math.round((d.getTime() - now) / 1000);
	const absDiff = Math.abs(diffSec);

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

	if (d.getFullYear() === currentYear) {
		return shortDateFmt.format(d);
	}
	return fullDateFmt.format(d);
}
