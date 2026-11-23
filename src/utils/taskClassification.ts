import { DateTime } from 'luxon';
import type { TaskTimeSection } from '@/types/domain';
import { parseIsoDate } from './dateUtils';

/**
 * Classifies a task into a smart time section based on due date and completion state.
 * Shared across all provider connectors.
 */
export function classifyTaskSection(due: string | null, dueComplete: boolean): TaskTimeSection {
  if (dueComplete) return 'completed';
  const dueDt = parseIsoDate(due);
  if (!dueDt) return 'later';

  const now = DateTime.now();
  const todayStart = now.startOf('day');
  const todayEnd = now.endOf('day');
  const upcomingEnd = todayStart.plus({ days: 7 });

  if (dueDt < todayStart) return 'overdue';
  if (dueDt >= todayStart && dueDt <= todayEnd) return 'today';
  if (dueDt > todayEnd && dueDt <= upcomingEnd) return 'upcoming';
  return 'later';
}
