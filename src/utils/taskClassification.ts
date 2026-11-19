import { DateTime } from 'luxon';
import type { AsanaSection } from '@/types/domain';
import { parseIsoDate } from './dateUtils';

/**
 * Classifies a task into an Asana smart section based on due date and completion state.
 * Shared across all provider connectors.
 */
export function classifyAsanaSection(due: string | null, dueComplete: boolean): AsanaSection {
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
