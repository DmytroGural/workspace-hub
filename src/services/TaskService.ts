import type {
  CreateTaskInput,
  GlobalMetrics,
  TaskFilterCriteria,
  WorkspaceMetrics,
} from '@/types/api';
import type {
  BoardList,
  ProviderAccount,
  TaskAttachment,
  TaskBoard,
  TaskComment,
  TaskInterface,
  TaskLabel,
  WorkspaceMember,
} from '@/types/domain';
import { taskCollaborationService } from './task/TaskCollaborationService';
import { taskMutationService } from './task/TaskMutationService';
import {
  computeGlobalMetrics,
  computeMetrics,
  filterTasks,
  isTaskAssignedToMe,
  paginateTasks,
  sortTasks,
} from './task/taskQueries';

/**
 * Facade over focused task query, mutation, and collaboration services.
 */
export class TaskService {
  isTaskAssignedToMe = isTaskAssignedToMe;
  filterTasks = filterTasks;
  sortTasks = sortTasks;
  paginateTasks = paginateTasks;

  computeMetrics(
    tasks: TaskInterface[],
    visibleBoards: TaskBoard[],
    criteria: Pick<
      TaskFilterCriteria,
      'selectedAccountId' | 'selectedBoardId' | 'onlyAssignedToMe' | 'myMemberIds' | 'myUsernames'
    >,
  ): WorkspaceMetrics {
    return computeMetrics(tasks, visibleBoards, criteria);
  }

  computeGlobalMetrics(
    tasks: TaskInterface[],
    criteria: Pick<
      TaskFilterCriteria,
      'selectedAccountId' | 'onlyAssignedToMe' | 'myMemberIds' | 'myUsernames'
    >,
  ): GlobalMetrics {
    return computeGlobalMetrics(tasks, criteria);
  }

  refreshTask(
    task: TaskInterface,
    board: TaskBoard | undefined,
    lists: BoardList[],
    account?: ProviderAccount,
  ) {
    return taskMutationService.refreshTask(task, board, lists, account);
  }

  toggleTaskComplete(task: TaskInterface, account?: ProviderAccount): Promise<boolean> {
    return taskMutationService.toggleTaskComplete(task, account);
  }

  updateTask(
    task: TaskInterface,
    updates: Partial<TaskInterface>,
    lists: BoardList[],
    account?: ProviderAccount,
  ): Promise<void> {
    return taskMutationService.updateTask(task, updates, lists, account);
  }

  archiveTask(task: TaskInterface, account?: ProviderAccount): Promise<void> {
    return taskMutationService.archiveTask(task, account);
  }

  deleteTask(task: TaskInterface, account?: ProviderAccount): Promise<void> {
    return taskMutationService.deleteTask(task, account);
  }

  createTask(
    input: CreateTaskInput,
    targetBoard: TaskBoard | undefined,
    targetList: BoardList | undefined,
    account: ProviderAccount | undefined,
    fallbackMember: WorkspaceMember,
  ): Promise<TaskInterface> {
    return taskMutationService.createTask(input, targetBoard, targetList, account, fallbackMember);
  }

  loadBoardMembers(boardId: string, account?: ProviderAccount): Promise<WorkspaceMember[]> {
    return taskMutationService.loadBoardMembers(boardId, account);
  }

  toggleTaskAssignee(
    task: TaskInterface,
    member: WorkspaceMember,
    account?: ProviderAccount,
  ): Promise<void> {
    return taskMutationService.toggleTaskAssignee(task, member, account);
  }

  loadBoardLabels(boardId: string, account?: ProviderAccount): Promise<TaskLabel[]> {
    return taskMutationService.loadBoardLabels(boardId, account);
  }

  toggleTaskLabel(task: TaskInterface, label: TaskLabel, account?: ProviderAccount): Promise<void> {
    return taskMutationService.toggleTaskLabel(task, label, account);
  }

  createBoardLabel(
    boardId: string,
    name: string,
    color: string,
    account?: ProviderAccount,
  ): Promise<TaskLabel> {
    return taskMutationService.createBoardLabel(boardId, name, color, account);
  }

  createAndAttachLabel(
    task: TaskInterface,
    name: string,
    color: string,
    account?: ProviderAccount,
  ): Promise<TaskLabel> {
    return taskMutationService.createAndAttachLabel(task, name, color, account);
  }

  toggleCheckItem(
    task: TaskInterface,
    checklistId: string,
    itemId: string,
    account?: ProviderAccount,
  ): Promise<void> {
    return taskMutationService.toggleCheckItem(task, checklistId, itemId, account);
  }

  uploadTaskAttachment(
    task: TaskInterface,
    file: File,
    account?: ProviderAccount,
  ): Promise<TaskAttachment> {
    return taskCollaborationService.uploadTaskAttachment(task, file, account);
  }

  deleteTaskAttachment(
    task: TaskInterface,
    attachmentId: string,
    account?: ProviderAccount,
  ): Promise<void> {
    return taskCollaborationService.deleteTaskAttachment(task, attachmentId, account);
  }

  loadTaskComments(task: TaskInterface, account?: ProviderAccount): Promise<TaskComment[]> {
    return taskCollaborationService.loadTaskComments(task, account);
  }

  addTaskComment(
    task: TaskInterface,
    text: string,
    account: ProviderAccount | undefined,
    fallbackMember: WorkspaceMember,
    files: File[] = [],
  ): Promise<TaskComment> {
    return taskCollaborationService.addTaskComment(task, text, account, fallbackMember, files);
  }

  updateTaskComment(
    task: TaskInterface,
    commentId: string,
    text: string,
    account?: ProviderAccount,
  ): Promise<TaskComment> {
    return taskCollaborationService.updateTaskComment(task, commentId, text, account);
  }

  deleteTaskComment(
    task: TaskInterface,
    commentId: string,
    account?: ProviderAccount,
  ): Promise<void> {
    return taskCollaborationService.deleteTaskComment(task, commentId, account);
  }
}

export const taskService = new TaskService();
