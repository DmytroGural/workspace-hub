import type { TaskInterface } from '@/types/domain';

export type TaskListGroupBy = 'list' | 'section' | 'board' | 'account' | 'label' | 'none';

export interface TaskListGroup {
  key: string;
  title: string;
  badgeColor?: string;
  color?: string;
  tasks: TaskInterface[];
}
