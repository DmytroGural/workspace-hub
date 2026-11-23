import type {
  BoardList,
  FilterSection,
  ProviderAccount,
  ProviderId,
  TaskAttachment,
  TaskBoard,
  TaskComment,
  TaskInterface,
  TaskLabel,
  WorkspaceMember,
} from './domain';

/**
 * Low-level HTTP transport abstraction so connectors stay decoupled from fetch/axios.
 */
export interface HttpRequestOptions {
  params?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  body?: unknown;
}

export interface IHttpClient {
  get<T>(url: string, options?: HttpRequestOptions): Promise<T>;
  post<T>(url: string, options?: HttpRequestOptions): Promise<T>;
  put<T>(url: string, options?: HttpRequestOptions): Promise<T>;
  patch<T>(url: string, options?: HttpRequestOptions): Promise<T>;
  delete<T>(url: string, options?: HttpRequestOptions): Promise<T>;
}

export interface AccountMeta {
  provider: ProviderId;
  accountId: string;
  accountLabel: string;
  accountColor: string;
  workspaceName?: string;
}

export type SyncProgressCallback = (loaded: number, total: number, boardName: string) => void;

export interface BoardSyncPayload {
  boards: TaskBoard[];
  lists: BoardList[];
  tasks: TaskInterface[];
}

export interface UpdateCardPayload {
  name?: string;
  desc?: string;
  due?: string | null;
  idList?: string;
  pos?: number;
  closed?: boolean;
}

export interface CreateCardPayload {
  idList: string;
  idBoard?: string;
  name: string;
  desc?: string;
  due?: string | null;
  labelIds?: string[];
  memberIds?: string[];
}

export interface CreatedCardResult {
  id: string;
  url: string;
}

/**
 * Primary API interface implemented by every external task/board provider connector
 * (Trello, Asana, Jira, Linear, GitHub Issues, etc.).
 * Core read methods are required; write/metadata methods are optional based on capabilities.
 */
export interface ITaskProviderApi {
  readonly providerId: ProviderId;
  readonly accountId: string;

  testConnection(): Promise<WorkspaceMember>;
  getMyBoards(): Promise<TaskBoard[]>;
  getListsForBoard(boardId: string): Promise<BoardList[]>;
  getCardsForBoard(board: TaskBoard, lists: BoardList[]): Promise<TaskInterface[]>;
  getCard(cardId: string, board: TaskBoard, lists: BoardList[]): Promise<TaskInterface | null>;
  fetchAllCrossBoardTasks(
    onProgress?: SyncProgressCallback,
    skipBoardIds?: Set<string>,
  ): Promise<BoardSyncPayload>;

  updateCardComplete?(cardId: string, dueComplete: boolean): Promise<void>;
  updateCard?(cardId: string, payload: UpdateCardPayload): Promise<void>;
  deleteCard?(cardId: string): Promise<void>;
  createCard?(payload: CreateCardPayload): Promise<CreatedCardResult>;
  toggleCheckItem?(
    cardId: string,
    checkItemId: string,
    state: 'complete' | 'incomplete',
  ): Promise<void>;
  getBoardLabels?(boardId: string): Promise<TaskLabel[]>;
  createBoardLabel?(boardId: string, name: string, color: string): Promise<TaskLabel>;
  toggleCardLabel?(cardId: string, labelId: string, attach: boolean): Promise<void>;
  getBoardMembers?(boardId: string): Promise<WorkspaceMember[]>;
  toggleCardMember?(cardId: string, memberId: string, assign: boolean): Promise<void>;
  getCardComments?(cardId: string): Promise<TaskComment[]>;
  addCardComment?(
    cardId: string,
    text: string,
    attachments?: TaskAttachment[],
  ): Promise<TaskComment>;
  updateCardComment?(
    cardId: string,
    commentId: string,
    text: string,
    attachments?: TaskAttachment[],
  ): Promise<TaskComment>;
  deleteCardComment?(cardId: string, commentId: string): Promise<void>;
  uploadAttachment?(cardId: string, file: File): Promise<TaskAttachment>;
  deleteAttachment?(cardId: string, attachmentId: string): Promise<void>;
}

/**
 * Declarative schema describing credentials and capabilities for a provider plugin.
 * Used by the Settings UI to render connection forms dynamically for any service.
 */
export interface ProviderCredentialField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url';
  placeholder?: string;
  hint?: string;
  required: boolean;
  monospace?: boolean;
}

export interface ProviderSetupStep {
  title: string;
  description: string;
  details?: string[];
  tip?: string;
  actionLabel?: string;
  actionUrl?: string;
  /** When true, the action button uses descriptor.getAuthHelperUrl(credentials). */
  usesAuthHelper?: boolean;
  authHelperDisabledHint?: string;
  /** Optional credential key whose non-empty (and valid) value marks this step visually ready. */
  completedWhenFieldFilled?: string;
}

export interface ProviderCapabilities {
  canCreateTask: boolean;
  canEditTask: boolean;
  canArchiveTask: boolean;
  canDeleteTask: boolean;
  canToggleComplete: boolean;
  canToggleSubtasks: boolean;
  canMoveBetweenLists: boolean;
  canManageLabels: boolean;
  canCreateLabels: boolean;
  canAssignMembers: boolean;
  canManageAttachments: boolean;
  canComment: boolean;
}

export const DEFAULT_PROVIDER_CAPABILITIES: ProviderCapabilities = {
  canCreateTask: true,
  canEditTask: true,
  canArchiveTask: true,
  canDeleteTask: true,
  canToggleComplete: true,
  canToggleSubtasks: true,
  canMoveBetweenLists: true,
  canManageLabels: true,
  canCreateLabels: true,
  canAssignMembers: true,
  canManageAttachments: true,
  canComment: true,
};

export interface ProviderDescriptor {
  id: ProviderId;
  name: string;
  tagline: string;
  badgeColor: string;
  docsUrl?: string;
  docsLabel?: string;
  authHelperLabel?: string;
  labelColors?: readonly string[];
  setupSteps?: ProviderSetupStep[];
  credentialFields: ProviderCredentialField[];
  capabilities: ProviderCapabilities;
  getAuthHelperUrl?: (credentials: Record<string, string>) => string | null;
  validateCredentials?: (credentials: Record<string, string>) => string | null;
  validateField?: (
    key: string,
    value: string,
    credentials: Record<string, string>,
  ) => string | null;
}

/**
 * Plugin contract that every provider (Trello, Asana, Jira, Linear, etc.) implements
 * to auto-register with ConnectorRegistry.
 */
export interface ProviderPlugin {
  readonly descriptor: ProviderDescriptor;
  createConnector(account: ProviderAccount): ITaskProviderApi;
}

export interface AddAccountInput {
  provider: ProviderId;
  label: string;
  credentials: Record<string, string>;
  color?: string;
}

export interface WorkspaceSyncResult {
  boards: TaskBoard[];
  lists: BoardList[];
  tasks: TaskInterface[];
  errors: string[];
}

export interface TaskFilterCriteria {
  selectedAccountId: string | null;
  selectedBoardId: string | null;
  filterSection: FilterSection;
  labelFilter: string;
  searchQuery: string;
  onlyAssignedToMe: boolean;
  myMemberIds: Set<string>;
  myUsernames: Set<string>;
}

export interface CreateTaskInput {
  name: string;
  idBoard: string;
  idList: string;
  desc?: string;
  due?: string | null;
  labels?: TaskLabel[];
  assignees?: WorkspaceMember[];
  files?: File[];
}

export interface BoardStat {
  id: string;
  name: string;
  color: string;
  provider: ProviderId;
  accountId: string;
  accountLabel: string;
  accountColor: string;
  total: number;
  completed: number;
  overdue: number;
}

export interface LabelStat {
  name: string;
  color: string;
  count: number;
}

export interface WorkspaceMetrics {
  total: number;
  completed: number;
  overdue: number;
  today: number;
  upcoming: number;
  later: number;
  completionRate: number;
  boardStats: BoardStat[];
  labelCounts: LabelStat[];
}

export interface GlobalMetrics {
  total: number;
  completed: number;
  overdue: number;
  today: number;
  upcoming: number;
}
