import { describe, expect, it, vi } from 'vitest';
import type { TaskBoard, TaskInterface } from '@/types/domain';
import { runOptimisticUpdate } from '../task/taskHelpers';
import {
  computeGlobalMetrics,
  computeMetrics,
  filterTasks,
  paginateTasks,
  sortTasks,
} from '../task/taskQueries';

function makeTask(overrides: Partial<TaskInterface> = {}): TaskInterface {
  return {
    id: 't1',
    name: 'Design homepage',
    desc: 'Initial wireframe',
    due: '2026-11-23T17:00:00.000Z',
    dueComplete: false,
    idBoard: 'b1',
    idList: 'l1',
    idMembers: ['m1'],
    labels: [{ id: 'lbl1', name: 'UI', color: 'blue' }],
    url: 'https://trello.com/c/1',
    provider: 'trello',
    accountId: 'acc1',
    accountLabel: 'Work',
    accountColor: '#4573d2',
    boardName: 'Product',
    boardColor: '#4573d2',
    listName: 'To Do',
    assignedMembers: [{ id: 'm1', fullName: 'Alice', username: 'alice' }],
    section: 'today',
    ...overrides,
  };
}

describe('taskQueries', () => {
  const tasks: TaskInterface[] = [
    makeTask({ id: 't1', section: 'today', due: '2026-11-23T17:00:00.000Z' }),
    makeTask({
      id: 't2',
      name: 'Fix API bug',
      section: 'overdue',
      due: '2026-11-20T17:00:00.000Z',
      labels: [],
    }),
    makeTask({
      id: 't3',
      name: 'Ship release',
      section: 'completed',
      dueComplete: true,
      idBoard: 'b2',
      boardName: 'Ops',
    }),
    makeTask({ id: 't4', closed: true }),
  ];

  const baseCriteria = {
    selectedAccountId: null,
    selectedBoardId: null,
    filterSection: 'all' as const,
    labelFilter: 'all',
    searchQuery: '',
    onlyAssignedToMe: true,
    myMemberIds: new Set(['m1']),
    myUsernames: new Set(['alice']),
  };

  it('excludes closed tasks and filters by search query and label', () => {
    expect(filterTasks(tasks, baseCriteria).map((t) => t.id)).toEqual(['t1', 't2', 't3']);
    expect(filterTasks(tasks, { ...baseCriteria, searchQuery: 'api' }).map((t) => t.id)).toEqual([
      't2',
    ]);
    expect(
      filterTasks(tasks, { ...baseCriteria, labelFilter: '__none__' }).map((t) => t.id),
    ).toEqual(['t2']);
    expect(filterTasks(tasks, { ...baseCriteria, labelFilter: 'UI' }).map((t) => t.id)).toEqual([
      't1',
      't3',
    ]);
  });

  it('sorts tasks by section priority and due date', () => {
    const active = filterTasks(tasks, baseCriteria);
    expect(sortTasks(active).map((t) => t.id)).toEqual(['t2', 't1', 't3']);
  });

  it('paginates safely with clamped page numbers', () => {
    const active = filterTasks(tasks, baseCriteria);
    expect(paginateTasks(active, 1, 2).map((t) => t.id)).toEqual(['t1', 't2']);
    expect(paginateTasks(active, 99, 2).map((t) => t.id)).toEqual(['t3']);
  });

  it('computes workspace and global metrics accurately', () => {
    const boards: TaskBoard[] = [
      {
        id: 'b1',
        name: 'Product',
        provider: 'trello',
        accountId: 'acc1',
        accountLabel: 'Work',
        accountColor: '#4573d2',
      },
    ];
    const metrics = computeMetrics(tasks, boards, baseCriteria);
    expect(metrics.total).toBe(3);
    expect(metrics.completed).toBe(1);
    expect(metrics.overdue).toBe(1);
    expect(metrics.today).toBe(1);
    expect(metrics.completionRate).toBe(33);
    expect(metrics.labelCounts).toEqual([{ name: 'UI', color: 'blue', count: 1 }]);

    const global = computeGlobalMetrics(tasks, baseCriteria);
    expect(global).toEqual({ total: 3, completed: 1, overdue: 1, today: 1, upcoming: 0 });
  });
});

describe('runOptimisticUpdate', () => {
  it('applies mutation and skips remote when no account is provided', async () => {
    let value = 0;
    const rollback = vi.fn();
    await runOptimisticUpdate({
      account: undefined,
      apply: () => {
        value = 1;
      },
      rollback,
      remote: () => Promise.resolve(),
      missingMethodMessage: 'missing',
    });
    expect(value).toBe(1);
    expect(rollback).not.toHaveBeenCalled();
  });
});
