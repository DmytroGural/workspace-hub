import type { BoardList, TaskInterface } from '@/types/domain';
import { getSortedBoardLists, SMART_SECTION_META, SMART_SECTION_ORDER } from '@/utils/taskGrouping';

export interface BoardColumn {
  id: string;
  title: string;
  topColor?: string;
  tasks: TaskInterface[];
  idBoard?: string;
  idList?: string;
}

const DEFAULT_POS_STEP = 65536;

function sortTasksByPos(tasks: TaskInterface[]): TaskInterface[] {
  return [...tasks].sort((a, b) => {
    const posA = typeof a.pos === 'number' ? a.pos : Number.MAX_SAFE_INTEGER;
    const posB = typeof b.pos === 'number' ? b.pos : Number.MAX_SAFE_INTEGER;
    return posA - posB;
  });
}

/** Computes a Trello-compatible numeric `pos` for inserting a task at `slotIndex`. */
export function computeInsertedTaskPos(
  columnTasks: TaskInterface[],
  draggedTask: TaskInterface,
  slotIndex: number,
): number | undefined {
  const originIndex = columnTasks.findIndex((t) => t.id === draggedTask.id);
  const isSameList = originIndex !== -1;

  if (isSameList && (slotIndex === originIndex || slotIndex === originIndex + 1)) {
    return undefined;
  }

  const remaining = columnTasks.filter((t) => t.id !== draggedTask.id);
  const rawInsertIndex = isSameList && slotIndex > originIndex ? slotIndex - 1 : slotIndex;
  const insertIndex = Math.max(0, Math.min(rawInsertIndex, remaining.length));

  if (remaining.length === 0) {
    return DEFAULT_POS_STEP;
  }

  const prev = insertIndex > 0 ? remaining[insertIndex - 1] : undefined;
  const next = insertIndex < remaining.length ? remaining[insertIndex] : undefined;

  if (!prev && next) {
    const nextPos = typeof next.pos === 'number' && next.pos > 0 ? next.pos : DEFAULT_POS_STEP;
    return nextPos / 2;
  }

  if (prev && !next) {
    const prevPos = typeof prev.pos === 'number' ? prev.pos : DEFAULT_POS_STEP;
    return prevPos + DEFAULT_POS_STEP;
  }

  if (prev && next) {
    const prevPos = typeof prev.pos === 'number' ? prev.pos : 0;
    const nextPos = typeof next.pos === 'number' ? next.pos : prevPos + DEFAULT_POS_STEP;
    if (nextPos > prevPos) {
      return (prevPos + nextPos) / 2;
    }
    return prevPos + DEFAULT_POS_STEP / 4;
  }

  return DEFAULT_POS_STEP;
}

/** Builds board columns either from lists of a selected board or cross-board smart sections. */
export function buildBoardColumns(
  lists: BoardList[],
  tasks: TaskInterface[],
  selectedBoardId: string | null,
): BoardColumn[] {
  if (selectedBoardId) {
    return getSortedBoardLists(lists, selectedBoardId).map((list) => ({
      id: list.id,
      title: list.name,
      idBoard: list.idBoard,
      idList: list.id,
      tasks: sortTasksByPos(tasks.filter((task) => task.idList === list.id)),
    }));
  }

  return SMART_SECTION_ORDER.map((sectionId) => {
    const meta = SMART_SECTION_META[sectionId];
    return {
      id: sectionId,
      title: meta.boardTitle,
      topColor: meta.boardTopColor,
      tasks: tasks.filter((task) => task.section === sectionId),
    };
  });
}
