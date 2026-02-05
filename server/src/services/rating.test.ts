import { describe, expect, it } from 'vitest';
import { updateElo } from './rating';

describe('updateElo', () => {
  it('raises winner rating and lowers loser rating', () => {
    const { newA, newB } = updateElo(1500, 1500, 1);
    expect(newA).toBeGreaterThan(1500);
    expect(newB).toBeLessThan(1500);
  });
});
