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
      tasks: tasks.filter((task) => task.idList === list.id),
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
