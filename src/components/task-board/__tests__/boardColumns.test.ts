import { describe, expect, it } from 'vitest';
import type { BoardList, TaskInterface } from '@/types/domain';
import { buildBoardColumns, computeInsertedTaskPos } from '../boardColumns';

function makeTask(id: string, idList: string, pos?: number): TaskInterface {
  return {
    id,
    name: `Task ${id}`,
    desc: '',
    due: null,
    dueComplete: false,
    idBoard: 'b1',
    idList,
    pos,
    idMembers: [],
    labels: [],
    url: '',
    provider: 'trello',
    accountId: 'acc1',
    accountLabel: 'Work',
    accountColor: '#4573d2',
    boardName: 'Board 1',
    boardColor: '#4573d2',
    listName: 'To Do',
    assignedMembers: [],
    section: 'later',
  };
}

describe('computeInsertedTaskPos', () => {
  const t1 = makeTask('t1', 'l1', 100);
  const t2 = makeTask('t2', 'l1', 200);
  const t3 = makeTask('t3', 'l1', 300);

  it('returns undefined when dropping into the same position in the same list', () => {
    expect(computeInsertedTaskPos([t1, t2, t3], t2, 1)).toBeUndefined();
    expect(computeInsertedTaskPos([t1, t2, t3], t2, 2)).toBeUndefined();
  });

  it('computes midpoint when moving between two cards', () => {
    expect(computeInsertedTaskPos([t1, t2, t3], t3, 1)).toBe(150);
    expect(computeInsertedTaskPos([t1, t2, t3], t1, 2)).toBe(250);
  });

  it('computes half of first pos when moving to top', () => {
    expect(computeInsertedTaskPos([t1, t2, t3], t3, 0)).toBe(50);
  });

  it('computes default step after last card when moving to bottom', () => {
    expect(computeInsertedTaskPos([t1, t2, t3], t1, 3)).toBe(300 + 65536);
  });

  it('computes default step when dropping into an empty column', () => {
    expect(computeInsertedTaskPos([], t1, 0)).toBe(65536);
  });
});

describe('buildBoardColumns', () => {
  it('builds sorted board columns with pos-sorted tasks when board is selected', () => {
    const lists: BoardList[] = [
      { id: 'l2', name: 'Done', idBoard: 'b1', accountId: 'acc1', provider: 'trello', pos: 20 },
      { id: 'l1', name: 'To Do', idBoard: 'b1', accountId: 'acc1', provider: 'trello', pos: 10 },
    ];
    const tasks = [makeTask('b', 'l1', 200), makeTask('a', 'l1', 100)];
    const cols = buildBoardColumns(lists, tasks, 'b1');

    expect(cols.map((c) => c.id)).toEqual(['l1', 'l2']);
    expect(cols[0].tasks.map((t) => t.id)).toEqual(['a', 'b']);
  });
});
