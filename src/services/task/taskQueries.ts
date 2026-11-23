import type {
  BoardStat,
  GlobalMetrics,
  LabelStat,
  TaskFilterCriteria,
  WorkspaceMetrics,
} from '@/types/api';
import type { TaskBoard, TaskInterface, TaskTimeSection } from '@/types/domain';
import { compareIsoDates } from '@/utils/dateUtils';
import { getLabelDisplayName } from '@/utils/labelColors';

const SECTION_SORT_ORDER: Record<TaskTimeSection, number> = {
  overdue: 0,
  today: 1,
  upcoming: 2,
  later: 3,
  completed: 4,
};

function isAccountRelevant(
  taskAccountId: string,
  taskAccountIds: string[] | undefined,
  selectedAccountId: string | null | undefined,
): boolean {
  if (!selectedAccountId) return true;
  return (
    taskAccountId === selectedAccountId || Boolean(taskAccountIds?.includes(selectedAccountId))
  );
}

export function isTaskAssignedToMe(
  task: TaskInterface,
  myMemberIds: Set<string>,
  myUsernames: Set<string>,
): boolean {
  if (task.idMembers.length === 0 && task.assignedMembers.length === 0) return true;
  const matchesMemberId = task.idMembers.some(
    (m) => myMemberIds.has(m) || myUsernames.has(m) || m.toLowerCase().includes('me'),
  );
  if (matchesMemberId) return true;
  return task.assignedMembers.some((m) => myMemberIds.has(m.id) || myUsernames.has(m.username));
}

function filterRelevantTasks(
  tasks: TaskInterface[],
  criteria: Pick<
    TaskFilterCriteria,
    'selectedAccountId' | 'onlyAssignedToMe' | 'myMemberIds' | 'myUsernames'
  > & { selectedBoardId?: string | null },
): TaskInterface[] {
  return tasks.filter((task) => {
    if (task.closed) return false;
    if (!isAccountRelevant(task.accountId, task.accountIds, criteria.selectedAccountId)) {
      return false;
    }
    if (criteria.selectedBoardId && task.idBoard !== criteria.selectedBoardId) {
      return false;
    }
    if (
      criteria.onlyAssignedToMe &&
      !isTaskAssignedToMe(task, criteria.myMemberIds, criteria.myUsernames)
    ) {
      return false;
    }
    return true;
  });
}

function countSectionMetrics(relevant: TaskInterface[]): GlobalMetrics {
  let completed = 0;
  let overdue = 0;
  let today = 0;
  let upcoming = 0;

  for (const task of relevant) {
    if (task.dueComplete) {
      completed++;
    } else if (task.section === 'overdue') {
      overdue++;
    } else if (task.section === 'today') {
      today++;
    } else if (task.section === 'upcoming') {
      upcoming++;
    }
  }

  return {
    total: relevant.length,
    completed,
    overdue,
    today,
    upcoming,
  };
}

export function filterTasks(tasks: TaskInterface[], criteria: TaskFilterCriteria): TaskInterface[] {
  const query = criteria.searchQuery.trim().toLowerCase();

  return tasks.filter((task) => {
    if (task.closed) return false;
    if (!isAccountRelevant(task.accountId, task.accountIds, criteria.selectedAccountId)) {
      return false;
    }
    if (criteria.selectedBoardId && task.idBoard !== criteria.selectedBoardId) {
      return false;
    }
    if (
      criteria.onlyAssignedToMe &&
      !isTaskAssignedToMe(task, criteria.myMemberIds, criteria.myUsernames)
    ) {
      return false;
    }

    if (criteria.filterSection === 'today' && task.section !== 'today') return false;
    if (criteria.filterSection === 'upcoming' && task.section !== 'upcoming') return false;
    if (criteria.filterSection === 'overdue' && task.section !== 'overdue') return false;
    if (criteria.filterSection === 'completed' && !task.dueComplete) return false;

    if (criteria.labelFilter === '__none__') {
      if (task.labels.length > 0) return false;
    } else if (
      criteria.labelFilter !== 'all' &&
      !task.labels.some((l) => getLabelDisplayName(l) === criteria.labelFilter)
    ) {
      return false;
    }

    if (query) {
      const matchName = task.name.toLowerCase().includes(query);
      const matchDesc = task.desc.toLowerCase().includes(query);
      const matchBoard = task.boardName.toLowerCase().includes(query);
      const matchAccount = task.accountLabel.toLowerCase().includes(query);
      const matchLabel = task.labels.some((l) => l.name.toLowerCase().includes(query));
      if (!matchName && !matchDesc && !matchBoard && !matchAccount && !matchLabel) {
        return false;
      }
    }

    return true;
  });
}

export function sortTasks(tasks: TaskInterface[]): TaskInterface[] {
  return [...tasks].sort((a, b) => {
    const secDiff = SECTION_SORT_ORDER[a.section] - SECTION_SORT_ORDER[b.section];
    if (secDiff !== 0) return secDiff;
    if (a.due && b.due) {
      return compareIsoDates(a.due, b.due);
    }
    if (a.due) return -1;
    if (b.due) return 1;
    return 0;
  });
}

export function paginateTasks(
  tasks: TaskInterface[],
  page: number,
  pageSize: number,
): TaskInterface[] {
  const totalPages = Math.max(1, Math.ceil(tasks.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return tasks.slice(start, start + pageSize);
}

export function computeMetrics(
  tasks: TaskInterface[],
  visibleBoards: TaskBoard[],
  criteria: Pick<
    TaskFilterCriteria,
    'selectedAccountId' | 'selectedBoardId' | 'onlyAssignedToMe' | 'myMemberIds' | 'myUsernames'
  >,
): WorkspaceMetrics {
  const relevant = filterRelevantTasks(tasks, criteria);
  const counts = countSectionMetrics(relevant);
  const later = relevant.filter((t) => t.section === 'later' && !t.dueComplete).length;
  const completionRate = counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0;

  const boardMap = new Map<string, BoardStat>();
  for (const b of visibleBoards) {
    boardMap.set(b.id, {
      id: b.id,
      provider: b.provider,
      name: b.name,
      color: b.prefs?.backgroundColor || '#4573d2',
      accountId: b.accountId,
      accountLabel: b.accountLabel,
      accountColor: b.accountColor,
      total: 0,
      completed: 0,
      overdue: 0,
    });
  }

  const labelMap = new Map<string, LabelStat>();

  for (const t of relevant) {
    let stat = boardMap.get(t.idBoard);
    if (!stat) {
      stat = {
        id: t.idBoard,
        provider: t.provider,
        name: t.boardName,
        color: t.boardColor,
        accountId: t.accountId,
        accountLabel: t.accountLabel,
        accountColor: t.accountColor,
        total: 0,
        completed: 0,
        overdue: 0,
      };
      boardMap.set(t.idBoard, stat);
    }
    stat.total++;
    if (t.dueComplete) {
      stat.completed++;
    } else {
      if (t.section === 'overdue') stat.overdue++;
      for (const l of t.labels) {
        const displayName = getLabelDisplayName(l);
        const existing = labelMap.get(displayName);
        if (existing) {
          existing.count++;
        } else {
          labelMap.set(displayName, {
            name: displayName,
            color: l.color,
            count: 1,
          });
        }
      }
    }
  }

  const boardStats = Array.from(boardMap.values()).filter((b) => b.total > 0);
  const labelCounts = Array.from(labelMap.values()).sort((a, b) => b.count - a.count);

  return {
    total: counts.total,
    completed: counts.completed,
    overdue: counts.overdue,
    today: counts.today,
    upcoming: counts.upcoming,
    later,
    completionRate,
    boardStats,
    labelCounts,
  };
}

export function computeGlobalMetrics(
  tasks: TaskInterface[],
  criteria: Pick<
    TaskFilterCriteria,
    'selectedAccountId' | 'onlyAssignedToMe' | 'myMemberIds' | 'myUsernames'
  >,
): GlobalMetrics {
  const relevant = filterRelevantTasks(tasks, criteria);
  return countSectionMetrics(relevant);
}
