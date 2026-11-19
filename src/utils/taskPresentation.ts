import type { TaskInterface, WorkspaceMember } from '@/types/domain';

export const DEFAULT_AVATAR_URL =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&auto=format&fit=crop&q=80';

export interface ChecklistRatio {
  done: number;
  total: number;
}

export type TaskDueTone = 'overdue' | 'today' | 'default';

/** Computes completed vs total checklist item counts for a task, or null when empty. */
export function getChecklistRatio(task: TaskInterface): ChecklistRatio | null {
  if (!task.checklists || task.checklists.length === 0) return null;
  let total = 0;
  let done = 0;
  for (const checklist of task.checklists) {
    for (const item of checklist.checkItems) {
      total++;
      if (item.state === 'complete') done++;
    }
  }
  return total > 0 ? { done, total } : null;
}

/** Returns comment count preferring loaded comments array length when available. */
export function getCommentsCount(task: TaskInterface): number {
  return task.comments ? task.comments.length : (task.commentsCount ?? 0);
}

/** Resolves visual urgency tone for a task due date badge. */
export function getTaskDueTone(task: Pick<TaskInterface, 'section' | 'dueComplete'>): TaskDueTone {
  if (task.dueComplete) return 'default';
  if (task.section === 'overdue') return 'overdue';
  if (task.section === 'today') return 'today';
  return 'default';
}

/** Formats a byte size into a compact human-readable string (e.g. "24 KB", "1.4 MB"). */
export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Returns 2-letter uppercase initials for a workspace member. */
export function getMemberInitials(member: Pick<WorkspaceMember, 'initials' | 'fullName'>): string {
  return member.initials || member.fullName.slice(0, 2).toUpperCase();
}
