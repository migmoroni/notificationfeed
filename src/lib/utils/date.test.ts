/**
 * Unit tests for date formatting utilities.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatRelativeDate, formatShortDate } from './date.js';

describe('formatRelativeDate', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('returns seconds-level relative for very recent dates', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-02-16T12:00:30Z'));

		const result = formatRelativeDate(new Date('2026-02-16T12:00:00Z'));
		// Should contain "segundo" or "seg" in pt-BR
		expect(result).toMatch(/segundo|seg|agora/i);
	});

	it('returns minutes-level relative for dates within an hour', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-02-16T12:15:00Z'));

		const result = formatRelativeDate(new Date('2026-02-16T12:00:00Z'));
		expect(result).toMatch(/15|minuto/i);
	});

	it('returns hours-level relative for dates within a day', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-02-16T15:00:00Z'));

		const result = formatRelativeDate(new Date('2026-02-16T12:00:00Z'));
		expect(result).toMatch(/3|hora/i);
	});

	it('returns days-level relative for dates within a week', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-02-18T12:00:00Z'));

		const result = formatRelativeDate(new Date('2026-02-16T12:00:00Z'));
		// pt-BR Intl may return 'anteontem' for 2 days ago
		expect(result).toMatch(/dia|anteontem|anteonte/i);
	});

	it('returns weeks-level relative for dates within a month', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-02-28T12:00:00Z'));

		const result = formatRelativeDate(new Date('2026-02-16T12:00:00Z'));
		// ~12 days = ~1-2 weeks
		expect(result).toMatch(/semana|1|2/i);
	});

	it('falls back to short date for dates older than a month', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-06-16T12:00:00Z'));

		const result = formatRelativeDate(new Date('2026-02-16T12:00:00Z'));
		// Should be formatted as a short date, e.g. "16 de fev."
		expect(result).toMatch(/fev/i);
	});

	it('accepts string dates', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-02-16T12:15:00Z'));

		const result = formatRelativeDate('2026-02-16T12:00:00Z');
		expect(result).toMatch(/15|minuto/i);
	});
});

describe('formatShortDate', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('formats same-year date without year', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-06-01T12:00:00Z'));

		// Use noon to avoid timezone-induced day shift
		const result = formatShortDate(new Date('2026-02-16T12:00:00Z'));
		expect(result).toMatch(/fev/i);
		// Should NOT include 2026
		expect(result).not.toMatch(/2026/);
	});

	it('includes year for different-year dates', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-06-01T00:00:00Z'));

		const result = formatShortDate(new Date('2025-12-25T00:00:00Z'));
		expect(result).toMatch(/25/);
		expect(result).toMatch(/dez/i);
		expect(result).toMatch(/2025/);
	});

	it('accepts string dates', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-06-01T12:00:00Z'));

		const result = formatShortDate('2026-02-16T12:00:00Z');
		expect(result).toMatch(/fev/i);
	});
});
