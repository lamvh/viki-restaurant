import { describe, expect, it } from 'vitest';

import { canCancel, isValidTransition, nextStatus } from './order-status';

describe('nextStatus', () => {
  it('walks the kitchen flow one step at a time', () => {
    expect(nextStatus('new')).toBe('preparing');
    expect(nextStatus('preparing')).toBe('ready');
    expect(nextStatus('ready')).toBe('completed');
  });

  it('stops at the end', () => {
    expect(nextStatus('completed')).toBeNull();
  });

  it('refuses to advance an unpaid order', () => {
    // Letting `pending_payment` progress would put food nobody has paid for
    // onto the pass.
    expect(nextStatus('pending_payment')).toBeNull();
  });

  it('returns null for a cancelled or unknown status', () => {
    expect(nextStatus('cancelled')).toBeNull();
    expect(nextStatus('nonsense')).toBeNull();
  });
});

describe('canCancel', () => {
  it('allows cancelling work in progress', () => {
    expect(canCancel('new')).toBe(true);
    expect(canCancel('preparing')).toBe(true);
    expect(canCancel('pending_payment')).toBe(true);
  });

  it('refuses to cancel a finished or already-cancelled order', () => {
    expect(canCancel('completed')).toBe(false);
    expect(canCancel('cancelled')).toBe(false);
  });
});

describe('isValidTransition', () => {
  it('permits only the next step', () => {
    expect(isValidTransition('new', 'preparing')).toBe(true);
    // A stale tab must not be able to skip the kitchen.
    expect(isValidTransition('new', 'ready')).toBe(false);
    expect(isValidTransition('new', 'completed')).toBe(false);
  });

  it('permits no backwards moves', () => {
    expect(isValidTransition('ready', 'preparing')).toBe(false);
  });

  it('permits cancelling anything unfinished', () => {
    expect(isValidTransition('preparing', 'cancelled')).toBe(true);
    expect(isValidTransition('completed', 'cancelled')).toBe(false);
  });

  it('rejects an arbitrary string from the client', () => {
    expect(isValidTransition('new', 'refunded')).toBe(false);
    expect(isValidTransition('new', 'paid')).toBe(false);
  });
});
