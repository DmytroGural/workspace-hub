import type { DateTime } from 'luxon';
import { DateTime as LuxonDateTime } from 'luxon';
import type { TaskInterface } from '@/types/domain';
import { parseIsoDate } from '@/utils/dateUtils';

export const CALENDAR_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export interface CalendarDay {
  date: DateTime;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  dateString: string;
  tasks: TaskInterface[];
}

function indexTasksByDate(tasks: TaskInterface[]): Map<string, TaskInterface[]> {
  const byDate = new Map<string, TaskInterface[]>();
  for (const task of tasks) {
    const key = parseIsoDate(task.due)?.toISODate();
    if (!key) continue;

    const bucket = byDate.get(key);

    if (bucket) {
      bucket.push(task);
    } else {
      byDate.set(key, [task]);
    }
  }
  return byDate;
}

/** Builds a 5- or 6-row Sunday-first calendar grid for the given month and tasks. */
export function buildCalendarDays(monthDate: DateTime, tasks: TaskInterface[]): CalendarDay[] {
  const monthStart = monthDate.startOf('month');
  const totalDays = monthStart.daysInMonth ?? 30;
  // Luxon weekday: 1 (Mon) .. 7 (Sun). Convert to Sunday-first index 0..6.
  const startingDayOfWeek = monthStart.weekday % 7;

  const days: CalendarDay[] = [];
  const todayStr = LuxonDateTime.now().toISODate() ?? '';
  const tasksByDate = indexTasksByDate(tasks);

  for (let i = startingDayOfWeek; i > 0; i--) {
    const dt = monthStart.minus({ days: i });
    const dateString = dt.toISODate() ?? '';
    days.push({
      date: dt,
      dayNumber: dt.day,
      isCurrentMonth: false,
      isToday: dateString === todayStr,
      dateString,
      tasks: [],
    });
  }

  for (let d = 0; d < totalDays; d++) {
    const dt = monthStart.plus({ days: d });
    const dateString = dt.toISODate() ?? '';
    days.push({
      date: dt,
      dayNumber: dt.day,
      isCurrentMonth: true,
      isToday: dateString === todayStr,
      dateString,
      tasks: tasksByDate.get(dateString) ?? [],
    });
  }

  const monthEnd = monthStart.endOf('month').startOf('day');
  const targetCellCount = days.length <= 35 ? 35 : 42;
  const remainingCells = Math.max(0, targetCellCount - days.length);

  for (let i = 1; i <= remainingCells; i++) {
    const dt = monthEnd.plus({ days: i });
    const dateString = dt.toISODate() ?? '';
    days.push({
      date: dt,
      dayNumber: dt.day,
      isCurrentMonth: false,
      isToday: dateString === todayStr,
      dateString,
      tasks: [],
    });
  }

  return days;
}
