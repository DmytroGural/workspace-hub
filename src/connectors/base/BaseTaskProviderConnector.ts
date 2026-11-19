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

/**
 * Extracts normalized account metadata passed into provider mappers and connectors.
 */
export function createAccountMeta(account: ProviderAccount): AccountMeta {
  return {
    provider: account.provider,
    accountId: account.id,
    accountLabel: account.label,
    accountColor: account.color,
  };
}

/**
 * Reusable base class for external task-provider connectors.
 * Supplies the standard cross-board sync loop and required account identity fields,
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
    const allLists: BoardList[] = [];
    const allTasks: TaskInterface[] = [];

    let index = 0;
    for (const board of boards) {
      index++;
      if (onProgress) {
        onProgress(index, boards.length, board.name);
      }

      if (skipBoardIds?.has(board.id)) {
        continue;
      }

      try {
        const lists = await this.getListsForBoard(board.id);
        allLists.push(...lists);
        const cards = await this.getCardsForBoard(board, lists);
        allTasks.push(...cards);
      } catch {
        // Individual board failure should not abort the entire cross-board sync
      }
    }

    return {
      boards,
      lists: allLists,
      tasks: allTasks,
    };
  }
}
