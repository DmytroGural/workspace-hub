import type {
  AccountMeta,
  BoardSyncPayload,
  ITaskProviderApi,
  SyncProgressCallback,
} from '@/types/api';
import type {
  BoardList,
  ProviderAccount,
  ProviderId,
  TaskBoard,
  TaskInterface,
  WorkspaceMember,
} from '@/types/domain';

const BOARD_SYNC_CONCURRENCY = 4;

/**
 * Extracts normalized account metadata passed into provider mappers and connectors.
 */
export function createAccountMeta(account: ProviderAccount): AccountMeta {
  return {
    provider: account.provider,
    accountId: account.id,
    accountLabel: account.label,
    accountColor: account.color,
    workspaceName: account.workspaceName,
  };
}

/**
 * Reusable base class for external task-provider connectors.
 * Supplies a bounded-concurrency cross-board sync loop and required account identity fields,
 * while leaving optional mutation/metadata methods for subclasses to implement per capabilities.
 */
export abstract class BaseTaskProviderConnector implements ITaskProviderApi {
  readonly providerId: ProviderId;
  readonly accountId: string;
  protected readonly meta: AccountMeta;

  constructor(meta: AccountMeta) {
    this.meta = meta;
    this.providerId = meta.provider;
    this.accountId = meta.accountId;
  }

  abstract testConnection(): Promise<WorkspaceMember>;
  abstract getMyBoards(): Promise<TaskBoard[]>;
  abstract getListsForBoard(boardId: string): Promise<BoardList[]>;
  abstract getCardsForBoard(board: TaskBoard, lists: BoardList[]): Promise<TaskInterface[]>;
  abstract getCard(
    cardId: string,
    board: TaskBoard,
    lists: BoardList[],
  ): Promise<TaskInterface | null>;

  async fetchAllCrossBoardTasks(
    onProgress?: SyncProgressCallback,
    skipBoardIds?: Set<string>,
  ): Promise<BoardSyncPayload> {
    const boards = await this.getMyBoards();
    const results: Array<{ lists: BoardList[]; tasks: TaskInterface[] }> = Array.from(
      { length: boards.length },
      () => ({ lists: [], tasks: [] }),
    );

    let nextIndex = 0;
    let completed = 0;

    const worker = async () => {
      while (nextIndex < boards.length) {
        const currentIndex = nextIndex++;
        const board = boards[currentIndex];
        if (!board) return;

        if (!skipBoardIds?.has(board.id)) {
          try {
            const lists = await this.getListsForBoard(board.id);
            const cards = await this.getCardsForBoard(board, lists);
            results[currentIndex] = { lists, tasks: cards };
          } catch {
            // Individual board failure should not abort the entire cross-board sync
          }
        }

        completed++;
        onProgress?.(completed, boards.length, board.name);
      }
    };

    const workerCount = Math.min(BOARD_SYNC_CONCURRENCY, boards.length);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    const allLists: BoardList[] = [];
    const allTasks: TaskInterface[] = [];
    for (const item of results) {
      allLists.push(...item.lists);
      allTasks.push(...item.tasks);
    }

    return {
      boards,
      lists: allLists,
      tasks: allTasks,
    };
  }
}
