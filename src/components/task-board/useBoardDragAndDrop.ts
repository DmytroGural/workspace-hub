import { ref } from 'vue';
import type { TaskInterface } from '@/types/domain';
import { computeInsertedTaskPos } from './boardColumns';

interface BoardDragAndDropOptions {
  isBoardScoped: () => boolean;
  canMoveTask: (task: TaskInterface) => boolean;
  findTaskById: (taskId: string) => TaskInterface | undefined;
  onDropTask: (taskId: string, targetListId: string, targetPos?: number) => void;
}

interface DropTarget {
  columnId: string;
  index: number;
}

/** Manages Kanban column & vertical drag-and-drop state and delegates moves cleanly. */
export function useBoardDragAndDrop(options: BoardDragAndDropOptions) {
  const draggedTaskId = ref<string | null>(null);
  const dragOriginListId = ref<string | null>(null);
  const dragOverColumnId = ref<string | null>(null);
  const dropTarget = ref<DropTarget | null>(null);

  function handleDragStart(event: DragEvent, task: TaskInterface) {
    if (!options.canMoveTask(task)) return;
    draggedTaskId.value = task.id;
    dragOriginListId.value = task.idList;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', task.id);
    }
  }

  function handleDragEnd() {
    draggedTaskId.value = null;
    dragOriginListId.value = null;
    dragOverColumnId.value = null;
    dropTarget.value = null;
  }

  function handleDragOver(event: DragEvent, columnId: string, fallbackIndex = 0) {
    if (!options.isBoardScoped() || !draggedTaskId.value) return;
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    dragOverColumnId.value = columnId !== dragOriginListId.value ? columnId : null;
    dropTarget.value = { columnId, index: fallbackIndex };
  }

  function handleCardDragOver(event: DragEvent, columnId: string, cardIndex: number) {
    if (!options.isBoardScoped() || !draggedTaskId.value) return;
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    const rect = (event.currentTarget as HTMLElement | null)?.getBoundingClientRect();
    const isAfter = rect ? event.clientY >= rect.top + rect.height / 2 : false;
    dragOverColumnId.value = columnId !== dragOriginListId.value ? columnId : null;
    dropTarget.value = { columnId, index: isAfter ? cardIndex + 1 : cardIndex };
  }

  function handleDragLeave(event: DragEvent, columnId: string) {
    const container = event.currentTarget as HTMLElement | null;
    const related = event.relatedTarget as Node | null;
    if (container && related && container.contains(related)) return;
    if (dragOverColumnId.value === columnId) {
      dragOverColumnId.value = null;
    }
    if (dropTarget.value?.columnId === columnId) {
      dropTarget.value = null;
    }
  }

  function isDropSlotActive(
    columnId: string,
    slotIndex: number,
    columnTasks: TaskInterface[],
  ): boolean {
    if (!draggedTaskId.value || !dropTarget.value) return false;
    if (dropTarget.value.columnId !== columnId || dropTarget.value.index !== slotIndex) {
      return false;
    }
    if (columnId === dragOriginListId.value) {
      const originIndex = columnTasks.findIndex((t) => t.id === draggedTaskId.value);
      if (originIndex !== -1 && (slotIndex === originIndex || slotIndex === originIndex + 1)) {
        return false;
      }
    }
    return true;
  }

  function handleDrop(event: DragEvent, targetListId: string, columnTasks: TaskInterface[]) {
    if (!options.isBoardScoped()) return;
    const taskId = draggedTaskId.value || event.dataTransfer?.getData('text/plain') || '';
    const targetSlot =
      dropTarget.value?.columnId === targetListId ? dropTarget.value.index : columnTasks.length;
    handleDragEnd();
    if (!taskId) return;

    const task = options.findTaskById(taskId);
    if (!task || !options.canMoveTask(task)) return;

    const nextPos = computeInsertedTaskPos(columnTasks, task, targetSlot);
    if (task.idList === targetListId && nextPos === undefined) return;
    options.onDropTask(task.id, targetListId, nextPos);
  }

  return {
    draggedTaskId,
    dragOverColumnId,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleCardDragOver,
    handleDragLeave,
    isDropSlotActive,
    handleDrop,
  };
}
