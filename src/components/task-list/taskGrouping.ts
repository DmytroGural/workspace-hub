import type { BoardList, TaskInterface } from '@/types/domain';
import { getLabelDisplayName } from '@/utils/labelColors';
import { SMART_SECTION_META, SMART_SECTION_ORDER } from '@/utils/taskSections';
import type { TaskListGroup, TaskListGroupBy } from './types';

function groupByList(
  source: TaskInterface[],
  lists: BoardList[],
  selectedBoardId: string | null,
): TaskListGroup[] {
  const listMetaMap = new Map<string, { name: string; pos: number }>();
  lists.forEach((list, idx) => {
    listMetaMap.set(list.id, {
      name: list.name,
      pos: typeof list.pos === 'number' ? list.pos : idx,
    });
  });

  const map = new Map<string, TaskListGroup & { pos: number }>();
  for (const task of source) {
    const meta = listMetaMap.get(task.idList);
    const baseName = meta?.name || task.listName || 'Other List';
    const title = selectedBoardId ? baseName : `${baseName} (${task.boardName})`;

    let group = map.get(task.idList);
    if (!group) {
      group = {
        key: task.idList,
        title,
        color: selectedBoardId ? undefined : task.boardColor,
        badgeColor: 'text-gray-800',
        tasks: [],
        pos: meta?.pos ?? Number.MAX_SAFE_INTEGER,
      };
      map.set(task.idList, group);
    }
    group.tasks.push(task);
  }

  return Array.from(map.values())
    .sort((a, b) => a.pos - b.pos || a.title.localeCompare(b.title))
    .map(({ pos: _pos, ...group }) => group);
}

function groupBySection(source: TaskInterface[]): TaskListGroup[] {
  return SMART_SECTION_ORDER.map((secKey) => ({
    key: secKey,
    title: SMART_SECTION_META[secKey].listTitle,
    badgeColor: SMART_SECTION_META[secKey].listBadgeColor,
    tasks: source.filter((task) => task.section === secKey),
  })).filter((group) => group.tasks.length > 0);
}

function groupByKey(
  source: TaskInterface[],
  getMeta: (task: TaskInterface) => { key: string; title: string; color?: string },
): TaskListGroup[] {
  const map = new Map<string, TaskListGroup>();
  for (const task of source) {
    const meta = getMeta(task);
    let group = map.get(meta.key);
    if (!group) {
      group = {
        key: meta.key,
        title: meta.title,
        color: meta.color,
        tasks: [],
      };
      map.set(meta.key, group);
    }
    group.tasks.push(task);
  }
  return Array.from(map.values());
}

function groupByLabel(source: TaskInterface[]): TaskListGroup[] {
  const map = new Map<string, TaskListGroup>();
  for (const task of source) {
    if (!task.labels || task.labels.length === 0) {
      let noLabelGroup = map.get('__none__');
      if (!noLabelGroup) {
        noLabelGroup = {
          key: '__none__',
          title: 'No Label',
          badgeColor: 'text-gray-500',
          tasks: [],
        };
        map.set('__none__', noLabelGroup);
      }
      noLabelGroup.tasks.push(task);
      continue;
    }

    const seenForTask = new Set<string>();
    for (const lbl of task.labels) {
      const labelName = getLabelDisplayName(lbl);
      if (seenForTask.has(labelName)) continue;
      seenForTask.add(labelName);

      let labelGroup = map.get(labelName);
      if (!labelGroup) {
        labelGroup = {
          key: `label:${labelName}`,
          title: labelName,
          badgeColor: 'text-gray-800',
          tasks: [],
        };
        map.set(labelName, labelGroup);
      }
      labelGroup.tasks.push(task);
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.key === '__none__') return 1;
    if (b.key === '__none__') return -1;
    return a.title.localeCompare(b.title);
  });
}

/**
 * Groups tasks for the list view according to the selected grouping criterion.
 */
export function groupTasksForList(
  source: TaskInterface[],
  groupBy: TaskListGroupBy,
  lists: BoardList[],
  selectedBoardId: string | null,
): TaskListGroup[] {
  if (groupBy === 'none') {
    if (source.length === 0) return [];
    return [
      {
        key: 'all',
        title: 'All Tasks',
        badgeColor: 'text-gray-800',
        tasks: source,
      },
    ];
  }

  if (groupBy === 'list') {
    return groupByList(source, lists, selectedBoardId);
  }

  if (groupBy === 'section') {
    return groupBySection(source);
  }

  if (groupBy === 'board') {
    return groupByKey(source, (task) => ({
      key: task.idBoard,
      title: `${task.boardName} (${task.accountLabel})`,
      color: task.boardColor,
    }));
  }

  if (groupBy === 'account') {
    return groupByKey(source, (task) => ({
      key: task.accountId,
      title: task.accountLabel,
      color: task.accountColor,
    }));
  }

  return groupByLabel(source);
}
