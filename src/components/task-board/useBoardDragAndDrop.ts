import { ref } from 'vue';
import type { TaskInterface } from '@/types/domain';

interface BoardDragAndDropOptions {
  isBoardScoped: () => boolean;
  canMoveTask: (task: TaskInterface) => boolean;
  findTaskById: (taskId: string) => TaskInterface | undefined;
  onDropTask: (taskId: string, targetListId: string) => void;
}

/** Manages Kanban column drag-and-drop state and delegates list moves cleanly. */
export function useBoardDragAndDrop(options: BoardDragAndDropOptions) {
  const draggedTaskId = ref<string | null>(null);
  const dragOriginListId = ref<string | null>(null);
  const dragOverColumnId = ref<string | null>(null);

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
  }

  function handleDragOver(event: DragEvent, columnId: string) {
    if (!options.isBoardScoped() || !draggedTaskId.value) return;
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    if (columnId !== dragOriginListId.value) {
      dragOverColumnId.value = columnId;
    }
  }

  function handleDragLeave(event: DragEvent, columnId: string) {
    const container = event.currentTarget as HTMLElement | null;
    const related = event.relatedTarget as Node | null;
    if (container && related && container.contains(related)) return;
    if (dragOverColumnId.value === columnId) {
      dragOverColumnId.value = null;
    }
  }

  function handleDrop(event: DragEvent, targetListId: string) {
    if (!options.isBoardScoped()) return;
    const taskId = draggedTaskId.value || event.dataTransfer?.getData('text/plain') || '';
    handleDragEnd();
    if (!taskId) return;

    const task = options.findTaskById(taskId);
    if (!task || !options.canMoveTask(task) || task.idList === targetListId) return;
    options.onDropTask(task.id, targetListId);
  }

  return {
    draggedTaskId,
    dragOverColumnId,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}
