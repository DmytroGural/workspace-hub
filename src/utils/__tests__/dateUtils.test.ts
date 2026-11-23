import { describe, expect, it } from 'vitest';
import {
  compareIsoDates,
  dateInputToIso,
  isoToDateInput,
  offsetDateIso,
  parseIsoDate,
} from '../dateUtils';
import { classifyTaskSection } from '../taskClassification';

describe('dateUtils', () => {
  it('parses valid ISO dates and rejects invalid/empty inputs', () => {
    expect(parseIsoDate(null)).toBeNull();
    expect(parseIsoDate(undefined)).toBeNull();
    expect(parseIsoDate('')).toBeNull();
    expect(parseIsoDate('not-a-date')).toBeNull();
    expect(parseIsoDate('2026-11-23T12:00:00.000Z')?.isValid).toBe(true);
  });

  it('round-trips dateInputToIso and isoToDateInput', () => {
    const iso = dateInputToIso('2026-05-15');
    expect(iso).toBeTruthy();
    expect(isoToDateInput(iso)).toBe('2026-05-15');
    expect(dateInputToIso('')).toBeNull();
  });

  it('compares ISO dates chronologically', () => {
    const earlier = '2026-01-01T10:00:00.000Z';
    const later = '2026-01-02T10:00:00.000Z';
    expect(compareIsoDates(earlier, later)).toBeLessThan(0);
    expect(compareIsoDates(later, earlier)).toBeGreaterThan(0);
    expect(compareIsoDates(earlier, earlier)).toBe(0);
  });
});

describe('classifyTaskSection', () => {
  it('returns completed whenever dueComplete is true', () => {
    expect(classifyTaskSection(offsetDateIso(-5), true)).toBe('completed');
    expect(classifyTaskSection(null, true)).toBe('completed');
  });

  it('returns later when due is null', () => {
    expect(classifyTaskSection(null, false)).toBe('later');
  });

  it('classifies overdue, today, upcoming, and later accurately', () => {
    expect(classifyTaskSection(offsetDateIso(-2), false)).toBe('overdue');
    expect(classifyTaskSection(offsetDateIso(0), false)).toBe('today');
    expect(classifyTaskSection(offsetDateIso(3), false)).toBe('upcoming');
    expect(classifyTaskSection(offsetDateIso(14), false)).toBe('later');
  });
});
