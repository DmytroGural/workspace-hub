import { describe, expect, it } from 'vitest';
import { deduplicateEntity } from '../tasks';

describe('deduplicateEntity', () => {
  it('merges duplicate entities by id and combines unique accountIds', () => {
    const result = deduplicateEntity([
      { id: '1', accountId: 'acc1', name: 'Board A' },
      { id: '1', accountId: 'acc2', name: 'Board A' },
      { id: '2', accountId: 'acc2', name: 'Board B', accountIds: ['acc2', 'acc3'] },
    ]);

    expect(result).toHaveLength(2);
    expect(result[0].accountIds).toEqual(['acc1', 'acc2']);
    expect(result[1].accountIds).toEqual(['acc2', 'acc3']);
  });
});
