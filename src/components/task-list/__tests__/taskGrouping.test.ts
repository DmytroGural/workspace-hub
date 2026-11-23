import { describe, expect, it } from 'vitest';
import type { BoardList, TaskInterface } from '@/types/domain';
import { groupTasksForList } from '../taskGrouping';

function makeTask(overrides: Partial<TaskInterface> = {}): TaskInterface {
  return {
    id: 't1',
    name: 'Task 1',
    desc: '',
    due: null,
    dueComplete: false,
    idBoard: 'b1',
    idList: 'l1',
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
    section: 'today',
    ...overrides,
  };
}

describe('groupTasksForList', () => {
  const lists: BoardList[] = [
    { id: 'l1', name: 'To Do', idBoard: 'b1', accountId: 'acc1', provider: 'trello', pos: 1 },
    { id: 'l2', name: 'Doing', idBoard: 'b1', accountId: 'acc1', provider: 'trello', pos: 2 },
  ];

  it('groups by section in smart order', () => {
    const tasks = [
      makeTask({ id: 't1', section: 'later' }),
      makeTask({ id: 't2', section: 'overdue' }),
      makeTask({ id: 't3', section: 'today' }),
    ];
    const groups = groupTasksForList(tasks, 'section', lists, null);
    expect(groups.map((g) => g.key)).toEqual(['overdue', 'today', 'later']);
  });

  it('groups by list ordered by list pos', () => {
    const tasks = [
      makeTask({ id: 't1', idList: 'l2', listName: 'Doing' }),
      makeTask({ id: 't2', idList: 'l1', listName: 'To Do' }),
    ];
    const groups = groupTasksForList(tasks, 'list', lists, 'b1');
    expect(groups.map((g) => g.key)).toEqual(['l1', 'l2']);
    expect(groups[0].title).toBe('To Do');
  });

  it('groups by label and places unlabeled tasks last', () => {
    const tasks = [
      makeTask({ id: 't1', labels: [] }),
      makeTask({ id: 't2', labels: [{ id: 'lbl1', name: 'Bug', color: 'red' }] }),
    ];
    const groups = groupTasksForList(tasks, 'label', lists, null);
    expect(groups.map((g) => g.title)).toEqual(['Bug', 'No Label']);
  });
});
