import { connectorRegistry } from '@/connectors';
import type { SyncProgressCallback, WorkspaceSyncResult } from '@/types/api';
import type { BoardList, ProviderAccount, TaskBoard, TaskInterface } from '@/types/domain';
import { nowIso } from '@/utils/dateUtils';
import { getErrorMessage } from '@/utils/errorUtils';

function appendUniqueAccountId(
  entity: { accountId: string; accountIds?: string[] },
  accountId: string,
): void {
  const accIds = entity.accountIds || [entity.accountId];
  if (!accIds.includes(accountId)) {
    accIds.push(accountId);
  }
  entity.accountIds = accIds;
}

function mergeAccountEntity<T extends { id: string; accountId: string; accountIds?: string[] }>(
  targetMap: Map<string, T>,
  incoming: T,
  accountId: string,
): boolean {
  const existing = targetMap.get(incoming.id);
  if (existing) {
    appendUniqueAccountId(existing, accountId);
    return false;
  }
  incoming.accountIds = [accountId];
  targetMap.set(incoming.id, incoming);
  return true;
}

export class WorkspaceSyncService {
  async syncEnabledAccounts(
    accounts: ProviderAccount[],
    onProgress?: SyncProgressCallback,
  ): Promise<WorkspaceSyncResult> {
    const enabled = accounts.filter((a) => a.enabled);
    const boardsMap = new Map<string, TaskBoard>();
    const listsMap = new Map<string, BoardList>();
    const tasksMap = new Map<string, TaskInterface>();
    const errors: string[] = [];
    const syncedBoardIds = new Set<string>();

    for (const acc of enabled) {
      acc.status = 'syncing';
      acc.error = null;

      try {
        const connector = connectorRegistry.getConnector(acc);
        if (!acc.member) {
          acc.member = await connector.testConnection();
        }

        const payload = await connector.fetchAllCrossBoardTasks((curr, total, boardName) => {
          if (onProgress) {
            onProgress(curr, total, `${acc.label}: ${boardName}`);
          }
        }, syncedBoardIds);

        for (const incomingBoard of payload.boards) {
          if (mergeAccountEntity(boardsMap, incomingBoard, acc.id)) {
            syncedBoardIds.add(incomingBoard.id);
          }
        }

        for (const incomingList of payload.lists) {
          mergeAccountEntity(listsMap, incomingList, acc.id);
        }

        for (const incomingTask of payload.tasks) {
          mergeAccountEntity(tasksMap, incomingTask, acc.id);
        }

        // Link this account ID to any lists/tasks of boards shared with a previously synced account
        const accountBoardIds = new Set(payload.boards.map((b) => b.id));
        for (const list of listsMap.values()) {
          if (accountBoardIds.has(list.idBoard)) {
            appendUniqueAccountId(list, acc.id);
          }
        }
        for (const task of tasksMap.values()) {
          if (accountBoardIds.has(task.idBoard)) {
            appendUniqueAccountId(task, acc.id);
          }
        }

        acc.status = 'connected';
        acc.lastSyncedAt = nowIso();
      } catch (err: unknown) {
        const msg = getErrorMessage(err, 'Sync failed');
        acc.status = 'error';
        acc.error = msg;
        errors.push(`${acc.label}: ${msg}`);
      }
    }

    return {
      boards: Array.from(boardsMap.values()),
      lists: Array.from(listsMap.values()),
      tasks: Array.from(tasksMap.values()),
      errors,
    };
  }

  /**
   * Fetches fresh lists and tasks for a single board via its provider connector.
   */
  async syncSingleBoard(
    board: TaskBoard,
    account: ProviderAccount,
  ): Promise<{ lists: BoardList[]; tasks: TaskInterface[] }> {
    const connector = connectorRegistry.getConnector(account);
    const boardLists = await connector.getListsForBoard(board.id);
    const boardTasks = await connector.getCardsForBoard(board, boardLists);
    account.status = 'connected';
    account.error = null;
    account.lastSyncedAt = nowIso();
    return { lists: boardLists, tasks: boardTasks };
  }
}

export const workspaceSyncService = new WorkspaceSyncService();
