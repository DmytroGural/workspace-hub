import type { AsanaSection, BoardList } from '@/types/domain';

export type TaskDisplayView = 'list' | 'board' | 'calendar';

export const VALID_TASK_VIEWS: readonly TaskDisplayView[] = ['list', 'board', 'calendar'];

export function resolveVisibleViewMode(rawView: unknown): TaskDisplayView {
  const candidate = String(rawView || 'list') as TaskDisplayView;
  return VALID_TASK_VIEWS.includes(candidate) ? candidate : 'list';
}

export const SMART_SECTION_ORDER: readonly AsanaSection[] = [
  'overdue',
  'today',
  'upcoming',
  'later',
  'completed',
];

export interface SmartSectionMeta {
  listTitle: string;
  listBadgeColor: string;
  boardTitle: string;
  boardTopColor: string;
}

export const SMART_SECTION_META: Record<AsanaSection, SmartSectionMeta> = {
  overdue: {
    listTitle: 'Overdue Action',
    listBadgeColor: 'text-rose-600',
    boardTitle: '🔴 Overdue Action',
    boardTopColor: 'border-t-rose-500',
  },
  today: {
    listTitle: 'Do Today',
    listBadgeColor: 'text-amber-600',
    boardTitle: '🟡 Due Today',
    boardTopColor: 'border-t-amber-500',
  },
  upcoming: {
    listTitle: 'Upcoming (Next 7 days)',
    listBadgeColor: 'text-blue-600',
    boardTitle: '🔵 Next 7 Days',
    boardTopColor: 'border-t-blue-500',
  },
  later: {
    listTitle: 'Later / Backlog',
    listBadgeColor: 'text-gray-600',
    boardTitle: '⚪ Later / Someday',
    boardTopColor: 'border-t-gray-400',
  },
  completed: {
    listTitle: 'Completed',
    listBadgeColor: 'text-emerald-600',
    boardTitle: '🟢 Completed',
    boardTopColor: 'border-t-emerald-500',
  },
};

/** Returns lists belonging to a board sorted by `pos` ascending. */
export function getSortedBoardLists(lists: BoardList[], boardId: string): BoardList[] {
  return lists
    .filter((list) => list.idBoard === boardId)
    .sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0));
}
