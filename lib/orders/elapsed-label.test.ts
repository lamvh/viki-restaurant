import { describe, expect, it } from 'vitest';

import { elapsedLabel } from './elapsed-label';

const NOW = new Date('2026-07-27T14:00:00.000Z');

/** A timestamp `ms` milliseconds before NOW. */
function ago(ms: number): string {
  return new Date(NOW.getTime() - ms).toISOString();
}

describe('elapsedLabel', () => {
  it('reads under a minute as "just now"', () => {
    expect(elapsedLabel(ago(30_000), NOW)).toBe('just now');
  });

  it('counts whole minutes within the first hour', () => {
    expect(elapsedLabel(ago(2 * 60_000), NOW)).toBe('2 min ago');
    expect(elapsedLabel(ago(59 * 60_000), NOW)).toBe('59 min ago');
  });

  it('switches to hours, singular at one', () => {
    expect(elapsedLabel(ago(60 * 60_000), NOW)).toBe('1 hr ago');
    expect(elapsedLabel(ago(5 * 60 * 60_000), NOW)).toBe('5 hrs ago');
  });

  it('switches to days past twenty-four hours', () => {
    expect(elapsedLabel(ago(25 * 60 * 60_000), NOW)).toBe('1 day ago');
    expect(elapsedLabel(ago(3 * 24 * 60 * 60_000), NOW)).toBe('3 days ago');
  });

  it('never renders a negative age when the clocks disagree', () => {
    expect(elapsedLabel(new Date(NOW.getTime() + 30_000), NOW)).toBe('just now');
  });

  it('returns an empty string for an unparseable timestamp', () => {
    expect(elapsedLabel('not a date', NOW)).toBe('');
  });
});
