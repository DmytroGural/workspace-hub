import { connectorRegistry } from '@/connectors';
import type {
  BoardStat,
  CreateTaskInput,
  GlobalMetrics,
  LabelStat,
  ProviderCapabilities,
  TaskFilterCriteria,
  WorkspaceMetrics,
} from '@/types/api';
import type {
  AsanaSection,
  BoardList,
  ProviderAccount,
  TaskAttachment,
  TaskBoard,
  TaskComment,
  TaskInterface,
  TaskLabel,
  WorkspaceMember,
} from '@/types/domain';
import { compareIsoDates, nowIso, nowMillis } from '@/utils/dateUtils';
import { getLabelDisplayName } from '@/utils/labelColors';
import { classifyAsanaSection as determineSection } from '@/utils/taskClassification';
import { celebrationService } from './CelebrationService';

const SECTION_SORT_ORDER: Record<AsanaSection, number> = {
  overdue: 0,
  today: 1,
  upcoming: 2,
  later: 3,
  completed: 4,
};

function localId(prefix: string): string {
  return `${prefix}_local_${nowMillis()}`;
}

function isAccountRelevant(
  taskAccountId: string,
  taskAccountIds: string[] | undefined,
  selectedAccountId: string | null | undefined,
): boolean {
  if (!selectedAccountId) return true;
  return (
    taskAccountId === selectedAccountId || Boolean(taskAccountIds?.includes(selectedAccountId))
  );
}

function filterRelevantTasks(
  tasks: TaskInterface[],
  criteria: Pick<
    TaskFilterCriteria,
    'selectedAccountId' | 'onlyAssignedToMe' | 'myMemberIds' | 'myUsernames'
  > & { selectedBoardId?: string | null },
  isAssignedToMe: (task: TaskInterface) => boolean,
): TaskInterface[] {
  return tasks.filter((task) => {
    if (task.closed) return false;
    if (!isAccountRelevant(task.accountId, task.accountIds, criteria.selectedAccountId)) {
      return false;
    }
    if (criteria.selectedBoardId && task.idBoard !== criteria.selectedBoardId) {
      return false;
    }
    if (criteria.onlyAssignedToMe && !isAssignedToMe(task)) {
      return false;
    }
    return true;
  });
}

function countSectionMetrics(relevant: TaskInterface[]) {
  return {
    total: relevant.length,
    completed: relevant.filter((t) => t.dueComplete).length,
    overdue: relevant.filter((t) => t.section === 'overdue' && !t.dueComplete).length,
    today: relevant.filter((t) => t.section === 'today' && !t.dueComplete).length,
    upcoming: relevant.filter((t) => t.section === 'upcoming' && !t.dueComplete).length,
  };
}

export class TaskService {
  private getCapabilities(account?: ProviderAccount): ProviderCapabilities {
    return connectorRegistry.getCapabilities(account?.provider);
  }

  private getActiveConnector(account?: ProviderAccount) {
    return account?.enabled ? connectorRegistry.getConnector(account) : null;
  }

  isTaskAssignedToMe(
    task: TaskInterface,
    myMemberIds: Set<string>,
    myUsernames: Set<string>,
  ): boolean {
    if (task.idMembers.length === 0 && task.assignedMembers.length === 0) return true;
    const matchesMemberId = task.idMembers.some(
      (m) => myMemberIds.has(m) || myUsernames.has(m) || m.toLowerCase().includes('me'),
    );
    if (matchesMemberId) return true;
    return task.assignedMembers.some((m) => myMemberIds.has(m.id) || myUsernames.has(m.username));
  }

  filterTasks(tasks: TaskInterface[], criteria: TaskFilterCriteria): TaskInterface[] {
    const query = criteria.searchQuery.trim().toLowerCase();

    return tasks.filter((task) => {
      if (task.closed) return false;
      if (!isAccountRelevant(task.accountId, task.accountIds, criteria.selectedAccountId)) {
        return false;
      }
      if (criteria.selectedBoardId && task.idBoard !== criteria.selectedBoardId) {
        return false;
      }
      if (
        criteria.onlyAssignedToMe &&
        !this.isTaskAssignedToMe(task, criteria.myMemberIds, criteria.myUsernames)
      ) {
        return false;
      }

      if (criteria.filterSection === 'today' && task.section !== 'today') return false;
      if (criteria.filterSection === 'upcoming' && task.section !== 'upcoming') return false;
      if (criteria.filterSection === 'overdue' && task.section !== 'overdue') return false;
      if (criteria.filterSection === 'completed' && !task.dueComplete) return false;

      if (criteria.labelFilter === '__none__') {
        if (task.labels.length > 0) return false;
      } else if (
        criteria.labelFilter !== 'all' &&
        !task.labels.some((l) => getLabelDisplayName(l) === criteria.labelFilter)
      ) {
        return false;
      }

      if (query) {
        const matchName = task.name.toLowerCase().includes(query);
        const matchDesc = task.desc.toLowerCase().includes(query);
        const matchBoard = task.boardName.toLowerCase().includes(query);
        const matchAccount = task.accountLabel.toLowerCase().includes(query);
        const matchLabel = task.labels.some((l) => l.name.toLowerCase().includes(query));
        if (!matchName && !matchDesc && !matchBoard && !matchAccount && !matchLabel) {
          return false;
        }
      }

      return true;
    });
  }

  sortTasks(tasks: TaskInterface[]): TaskInterface[] {
    return [...tasks].sort((a, b) => {
      const secDiff = SECTION_SORT_ORDER[a.section] - SECTION_SORT_ORDER[b.section];
      if (secDiff !== 0) return secDiff;
      if (a.due && b.due) {
        return compareIsoDates(a.due, b.due);
      }
      if (a.due) return -1;
      if (b.due) return 1;
      return 0;
    });
  }

  paginateTasks(tasks: TaskInterface[], page: number, pageSize: number): TaskInterface[] {
    const totalPages = Math.max(1, Math.ceil(tasks.length / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * pageSize;
    return tasks.slice(start, start + pageSize);
  }

  computeMetrics(
    tasks: TaskInterface[],
    visibleBoards: TaskBoard[],
    criteria: Pick<
      TaskFilterCriteria,
      'selectedAccountId' | 'selectedBoardId' | 'onlyAssignedToMe' | 'myMemberIds' | 'myUsernames'
    >,
  ): WorkspaceMetrics {
    const relevant = filterRelevantTasks(tasks, criteria, (t) =>
      this.isTaskAssignedToMe(t, criteria.myMemberIds, criteria.myUsernames),
    );

    const counts = countSectionMetrics(relevant);
    const later = relevant.filter((t) => t.section === 'later' && !t.dueComplete).length;
    const completionRate =
      counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0;

    const boardMap = new Map<string, BoardStat>();
    visibleBoards.forEach((b) => {
      boardMap.set(b.id, {
        id: b.id,
        provider: b.provider,
        name: b.name,
        color: b.prefs?.backgroundColor || '#4573d2',
        accountId: b.accountId,
        accountLabel: b.accountLabel,
        accountColor: b.accountColor,
        total: 0,
        completed: 0,
        overdue: 0,
      });
    });

    relevant.forEach((t) => {
      let stat = boardMap.get(t.idBoard);
      if (!stat) {
        stat = {
          id: t.idBoard,
          provider: t.provider,
          name: t.boardName,
          color: t.boardColor,
          accountId: t.accountId,
          accountLabel: t.accountLabel,
          accountColor: t.accountColor,
          total: 0,
          completed: 0,
          overdue: 0,
        };
        boardMap.set(t.idBoard, stat);
      }
      stat.total++;
      if (t.dueComplete) stat.completed++;
      if (t.section === 'overdue' && !t.dueComplete) stat.overdue++;
    });

    const boardStats = Array.from(boardMap.values()).filter((b) => b.total > 0);

    const labelMap = new Map<string, LabelStat>();
    relevant
      .filter((t) => !t.dueComplete)
      .forEach((t) => {
        t.labels.forEach((l) => {
          const displayName = getLabelDisplayName(l);
          const existing = labelMap.get(displayName);
          if (existing) {
            existing.count++;
          } else {
            labelMap.set(displayName, {
              name: displayName,
              color: l.color,
              count: 1,
            });
          }
        });
      });

    const labelCounts = Array.from(labelMap.values()).sort((a, b) => b.count - a.count);

    return {
      total: counts.total,
      completed: counts.completed,
      overdue: counts.overdue,
      today: counts.today,
      upcoming: counts.upcoming,
      later,
      completionRate,
      boardStats,
      labelCounts,
    };
  }

  computeGlobalMetrics(
    tasks: TaskInterface[],
    criteria: Pick<
      TaskFilterCriteria,
      'selectedAccountId' | 'onlyAssignedToMe' | 'myMemberIds' | 'myUsernames'
    >,
  ): GlobalMetrics {
    const relevant = filterRelevantTasks(tasks, criteria, (t) =>
      this.isTaskAssignedToMe(t, criteria.myMemberIds, criteria.myUsernames),
    );
    return countSectionMetrics(relevant);
  }

  async refreshTask(
    task: TaskInterface,
    board: TaskBoard | undefined,
    lists: BoardList[],
    account?: ProviderAccount,
  ): Promise<{ task: TaskInterface; updatedLists?: BoardList[] } | null> {
    if (!account?.enabled || !board) return null;
    const connector = this.getActiveConnector(account);
    if (!connector) return null;

    const boardLists = lists.filter((l) => l.idBoard === board.id);
    const fresh = await connector.getCard(task.id, board, boardLists);
    if (!fresh) return null;

    if (fresh.idList && !boardLists.some((l) => l.id === fresh.idList)) {
      const refreshedLists = await connector.getListsForBoard(board.id);
      const matchedList = refreshedLists.find((l) => l.id === fresh.idList);
      if (matchedList) {
        fresh.listName = matchedList.name;
      }
      return { task: fresh, updatedLists: refreshedLists };
    }

    return { task: fresh };
  }

  async toggleTaskComplete(task: TaskInterface, account?: ProviderAccount): Promise<void> {
    const caps = this.getCapabilities(account);
    if (!caps.canToggleComplete) {
      throw new Error(`Completing tasks is not supported by provider "${task.provider}"`);
    }

    const prevComplete = task.dueComplete;
    const prevSection = task.section;
    const nextState = !task.dueComplete;
    task.dueComplete = nextState;
    task.section = nextState ? 'completed' : determineSection(task.due, false);

    if (nextState) {
      celebrationService.triggerTaskComplete();
    }

    const connector = this.getActiveConnector(account);
    if (connector) {
      if (!connector.updateCardComplete) {
        task.dueComplete = prevComplete;
        task.section = prevSection;
        throw new Error(
          `Provider "${account?.provider}" does not implement task completion updates`,
        );
      }
      try {
        await connector.updateCardComplete(task.id, nextState);
      } catch (err) {
        task.dueComplete = prevComplete;
        task.section = prevSection;
        throw err;
      }
    }
  }

  async updateTask(
    task: TaskInterface,
    updates: Partial<TaskInterface>,
    lists: BoardList[],
    account?: ProviderAccount,
  ): Promise<void> {
    const caps = this.getCapabilities(account);
    const isMoveOnly =
      updates.idList !== undefined &&
      updates.name === undefined &&
      updates.desc === undefined &&
      updates.due === undefined;

    if (isMoveOnly && !caps.canMoveBetweenLists) {
      throw new Error(`Moving tasks between lists is not supported by provider "${task.provider}"`);
    }
    if (!isMoveOnly && !caps.canEditTask) {
      throw new Error(`Editing tasks is not supported by provider "${task.provider}"`);
    }

    const previousSnapshot: Partial<TaskInterface> = {
      name: task.name,
      desc: task.desc,
      due: task.due,
      section: task.section,
      idList: task.idList,
      listName: task.listName,
    };

    Object.assign(task, updates);

    if (updates.due !== undefined) {
      task.section = determineSection(task.due, task.dueComplete);
    }

    if (updates.idList) {
      const listObj = lists.find((l) => l.id === updates.idList);
      if (listObj) {
        task.listName = listObj.name;
      }
    }

    const connector = this.getActiveConnector(account);
    if (connector) {
      if (!connector.updateCard) {
        Object.assign(task, previousSnapshot);
        throw new Error(`Provider "${account?.provider}" does not implement task updates`);
      }
      try {
        await connector.updateCard(task.id, {
          name: updates.name,
          desc: updates.desc,
          due: updates.due,
          idList: updates.idList,
          closed: updates.closed,
        });
      } catch (err) {
        Object.assign(task, previousSnapshot);
        throw err;
      }
    }
  }

  async archiveTask(task: TaskInterface, account?: ProviderAccount): Promise<void> {
    if (!this.getCapabilities(account).canArchiveTask) {
      throw new Error(`Archiving tasks is not supported by provider "${task.provider}"`);
    }

    const previousClosed = task.closed;
    task.closed = true;

    const connector = this.getActiveConnector(account);
    if (connector) {
      if (!connector.updateCard) {
        task.closed = previousClosed;
        throw new Error(`Provider "${account?.provider}" does not implement task archiving`);
      }
      try {
        await connector.updateCard(task.id, { closed: true });
      } catch (err) {
        task.closed = previousClosed;
        throw err;
      }
    }
  }

  async deleteTask(task: TaskInterface, account?: ProviderAccount): Promise<void> {
    if (!this.getCapabilities(account).canDeleteTask) {
      throw new Error(`Deleting tasks is not supported by provider "${task.provider}"`);
    }

    const connector = this.getActiveConnector(account);
    if (connector) {
      if (!connector.deleteCard) {
        throw new Error(`Provider "${account?.provider}" does not implement task deletion`);
      }
      await connector.deleteCard(task.id);
    }
  }

  async createTask(
    input: CreateTaskInput,
    targetBoard: TaskBoard | undefined,
    targetList: BoardList | undefined,
    account: ProviderAccount | undefined,
    fallbackMember: WorkspaceMember,
  ): Promise<TaskInterface> {
    const caps = this.getCapabilities(account);
    if (!caps.canCreateTask) {
      throw new Error(
        `Creating tasks is not supported by provider "${account?.provider || targetBoard?.provider || 'unknown'}"`,
      );
    }

    const authorMember = account?.member || fallbackMember;
    const provider = account?.provider || targetBoard?.provider || '';
    const selectedLabels = input.labels ? input.labels.map((l) => ({ ...l })) : [];
    const selectedAssignees =
      input.assignees !== undefined ? input.assignees.map((m) => ({ ...m })) : [authorMember];

    const newTask: TaskInterface = {
      id: localId('task'),
      provider,
      name: input.name,
      desc: input.desc || '',
      due: input.due || null,
      dueComplete: false,
      idBoard: input.idBoard,
      idList: input.idList,
      idMembers: selectedAssignees.map((m) => m.id),
      labels: selectedLabels,
      url: targetBoard?.url || '',
      accountId: account?.id || targetBoard?.accountId || '',
      accountLabel: targetBoard?.accountLabel || account?.label || 'Workspace',
      accountColor: targetBoard?.accountColor || account?.color || '#4573d2',
      accountIds: targetBoard?.accountIds || (account?.id ? [account.id] : []),
      boardName: targetBoard?.name || 'Board',
      boardColor: targetBoard?.prefs?.backgroundColor || '#4573d2',
      listName: targetList?.name || 'To Do',
      assignedMembers: selectedAssignees,
      section: determineSection(input.due || null, false),
      checklists: [],
      commentsCount: 0,
    };

    const connector = this.getActiveConnector(account);
    if (connector) {
      if (!connector.createCard) {
        throw new Error(`Provider "${account?.provider}" does not implement task creation`);
      }
      const created = await connector.createCard({
        idList: input.idList,
        idBoard: input.idBoard,
        name: input.name,
        desc: input.desc,
        due: input.due,
        labelIds: selectedLabels.map((l) => l.id),
        memberIds: selectedAssignees.map((m) => m.id),
      });
      newTask.id = created.id;
      newTask.url = created.url;
    }

    return newTask;
  }

  async loadBoardMembers(boardId: string, account?: ProviderAccount): Promise<WorkspaceMember[]> {
    if (!this.getCapabilities(account).canAssignMembers) return [];
    const connector = this.getActiveConnector(account);
    return connector?.getBoardMembers ? connector.getBoardMembers(boardId) : [];
  }

  async toggleTaskAssignee(
    task: TaskInterface,
    member: WorkspaceMember,
    account?: ProviderAccount,
  ): Promise<void> {
    if (!this.getCapabilities(account).canAssignMembers) {
      throw new Error(`Assigning members is not supported by provider "${task.provider}"`);
    }

    const exists =
      task.idMembers.includes(member.id) || task.assignedMembers.some((m) => m.id === member.id);
    const previousIds = [...task.idMembers];
    const previousMembers = [...task.assignedMembers];

    if (exists) {
      task.idMembers = task.idMembers.filter((id) => id !== member.id);
      task.assignedMembers = task.assignedMembers.filter((m) => m.id !== member.id);
    } else {
      task.idMembers = [...task.idMembers, member.id];
      task.assignedMembers = [...task.assignedMembers, { ...member }];
    }

    const connector = this.getActiveConnector(account);
    if (connector) {
      if (!connector.toggleCardMember) {
        task.idMembers = previousIds;
        task.assignedMembers = previousMembers;
        throw new Error(`Provider "${account?.provider}" does not implement member assignment`);
      }
      try {
        await connector.toggleCardMember(task.id, member.id, !exists);
      } catch (err) {
        task.idMembers = previousIds;
        task.assignedMembers = previousMembers;
        throw err;
      }
    }
  }

  async loadBoardLabels(boardId: string, account?: ProviderAccount): Promise<TaskLabel[]> {
    if (!this.getCapabilities(account).canManageLabels) return [];
    const connector = this.getActiveConnector(account);
    return connector?.getBoardLabels ? connector.getBoardLabels(boardId) : [];
  }

  async toggleTaskLabel(
    task: TaskInterface,
    label: TaskLabel,
    account?: ProviderAccount,
  ): Promise<void> {
    if (!this.getCapabilities(account).canManageLabels) {
      throw new Error(`Managing labels is not supported by provider "${task.provider}"`);
    }

    const exists = task.labels.some((l) => l.id === label.id);
    const previousLabels = [...task.labels];

    if (exists) {
      task.labels = task.labels.filter((l) => l.id !== label.id);
    } else {
      task.labels = [...task.labels, { ...label }];
    }

    const connector = this.getActiveConnector(account);
    if (connector) {
      if (!connector.toggleCardLabel) {
        task.labels = previousLabels;
        throw new Error(`Provider "${account?.provider}" does not implement label toggling`);
      }
      try {
        await connector.toggleCardLabel(task.id, label.id, !exists);
      } catch (err) {
        task.labels = previousLabels;
        throw err;
      }
    }
  }

  async createBoardLabel(
    boardId: string,
    name: string,
    color: string,
    account?: ProviderAccount,
  ): Promise<TaskLabel> {
    const caps = this.getCapabilities(account);
    if (!caps.canCreateLabels || !caps.canManageLabels) {
      throw new Error(
        `Creating labels is not supported by provider "${account?.provider || 'default'}"`,
      );
    }

    const connector = this.getActiveConnector(account);
    if (connector?.createBoardLabel) {
      return connector.createBoardLabel(boardId, name.trim(), color);
    }

    return {
      id: localId('lbl'),
      idBoard: boardId,
      name: name.trim(),
      color,
    };
  }

  async createAndAttachLabel(
    task: TaskInterface,
    name: string,
    color: string,
    account?: ProviderAccount,
  ): Promise<TaskLabel> {
    const created = await this.createBoardLabel(task.idBoard, name, color, account);
    const connector = this.getActiveConnector(account);
    if (connector?.toggleCardLabel) {
      await connector.toggleCardLabel(task.id, created.id, true);
    }

    if (!task.labels.some((l) => l.id === created.id)) {
      task.labels = [...task.labels, created];
    }
    return created;
  }

  async toggleCheckItem(
    task: TaskInterface,
    checklistId: string,
    itemId: string,
    account?: ProviderAccount,
  ): Promise<void> {
    if (!this.getCapabilities(account).canToggleSubtasks) {
      throw new Error(`Toggling subtasks is not supported by provider "${task.provider}"`);
    }

    if (!task.checklists) return;
    const checklist = task.checklists.find((c) => c.id === checklistId);
    if (!checklist) return;
    const item = checklist.checkItems.find((i) => i.id === itemId);
    if (!item) return;

    const prevState = item.state;
    item.state = item.state === 'complete' ? 'incomplete' : 'complete';

    const connector = this.getActiveConnector(account);
    if (connector) {
      if (!connector.toggleCheckItem) {
        item.state = prevState;
        throw new Error(`Provider "${account?.provider}" does not implement subtask updates`);
      }
      try {
        await connector.toggleCheckItem(task.id, itemId, item.state);
      } catch (err) {
        item.state = prevState;
        throw err;
      }
    }
  }

  private enrichCommentAttachments(task: TaskInterface, comments: TaskComment[]): TaskComment[] {
    const cardAttachments = task.attachments || [];
    if (cardAttachments.length === 0) return comments;

    const byUrl = new Map(cardAttachments.map((att) => [att.url, att]));
    return comments.map((cmt) => {
      if (!cmt.attachments || cmt.attachments.length === 0) return cmt;
      return {
        ...cmt,
        attachments: cmt.attachments.map((att) => {
          const matched = byUrl.get(att.url);
          return matched ? { ...att, ...matched } : att;
        }),
      };
    });
  }

  async uploadTaskAttachment(
    task: TaskInterface,
    file: File,
    account?: ProviderAccount,
  ): Promise<TaskAttachment> {
    if (!this.getCapabilities(account).canManageAttachments) {
      throw new Error(`Attachments are not supported by provider "${task.provider}"`);
    }

    const connector = this.getActiveConnector(account);
    let created: TaskAttachment;

    if (connector) {
      if (!connector.uploadAttachment) {
        throw new Error(`Provider "${account?.provider}" does not implement file uploads`);
      }
      created = await connector.uploadAttachment(task.id, file);
    } else {
      const objectUrl = URL.createObjectURL(file);
      const isImage = file.type.startsWith('image/');
      created = {
        id: localId('att'),
        name: file.name,
        url: objectUrl,
        mimeType: file.type || undefined,
        bytes: file.size,
        previewUrl: isImage ? objectUrl : undefined,
        createdAt: nowIso(),
        isImage,
      };
    }

    const existing = task.attachments || [];
    task.attachments = existing.some((a) => a.id === created.id)
      ? existing
      : [...existing, created];
    return created;
  }

  async deleteTaskAttachment(
    task: TaskInterface,
    attachmentId: string,
    account?: ProviderAccount,
  ): Promise<void> {
    if (!this.getCapabilities(account).canManageAttachments) {
      throw new Error(`Removing attachments is not supported by provider "${task.provider}"`);
    }

    const previous = [...(task.attachments || [])];
    task.attachments = previous.filter((a) => a.id !== attachmentId);

    const connector = this.getActiveConnector(account);
    if (connector) {
      if (!connector.deleteAttachment) {
        task.attachments = previous;
        throw new Error(`Provider "${account?.provider}" does not implement attachment deletion`);
      }
      try {
        await connector.deleteAttachment(task.id, attachmentId);
      } catch (err) {
        task.attachments = previous;
        throw err;
      }
    }
  }

  async loadTaskComments(task: TaskInterface, account?: ProviderAccount): Promise<TaskComment[]> {
    if (!this.getCapabilities(account).canComment) return task.comments || [];
    const connector = this.getActiveConnector(account);
    if (!connector?.getCardComments) return task.comments || [];

    const rawComments = await connector.getCardComments(task.id);
    const comments = this.enrichCommentAttachments(task, rawComments);
    task.comments = comments;
    task.commentsCount = comments.length;
    return comments;
  }

  async addTaskComment(
    task: TaskInterface,
    text: string,
    account: ProviderAccount | undefined,
    fallbackMember: WorkspaceMember,
    files: File[] = [],
  ): Promise<TaskComment> {
    if (!this.getCapabilities(account).canComment) {
      throw new Error(`Comments are not supported by provider "${task.provider}"`);
    }

    const uploadedAttachments: TaskAttachment[] = [];
    for (const file of files) {
      const uploaded = await this.uploadTaskAttachment(task, file, account);
      uploadedAttachments.push(uploaded);
    }

    const trimmed = text.trim();
    const connector = this.getActiveConnector(account);
    let created: TaskComment;

    if (connector) {
      if (!connector.addCardComment) {
        throw new Error(`Provider "${account?.provider}" does not implement adding comments`);
      }
      created = await connector.addCardComment(task.id, trimmed, uploadedAttachments);
    } else {
      created = {
        id: localId('cmt'),
        text: trimmed,
        createdAt: nowIso(),
        author: account?.member || fallbackMember,
        attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
      };
    }

    task.comments = [...(task.comments || []), created];
    task.commentsCount = task.comments.length;
    return created;
  }
}

export const taskService = new TaskService();
