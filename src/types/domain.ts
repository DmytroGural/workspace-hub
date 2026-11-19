export type ProviderId = 'trello' | 'asana' | 'jira' | 'linear' | 'github' | (string & {});

export interface WorkspaceMember {
  id: string;
  fullName: string;
  username: string;
  avatarUrl?: string;
  initials?: string;
}

export interface ProviderAccount {
  id: string;
  provider: ProviderId;
  label: string;
  credentials: Record<string, string>;
  color: string;
  enabled: boolean;
  status: 'connected' | 'error' | 'syncing' | 'idle';
  error?: string | null;
  member: WorkspaceMember | null;
  lastSyncedAt?: string | null;
}

export interface TaskLabel {
  id: string;
  idBoard?: string;
  name: string;
  color: string;
}

export interface TaskCheckItem {
  id: string;
  name: string;
  state: 'complete' | 'incomplete';
}

export interface TaskChecklist {
  id: string;
  idBoard: string;
  idCard: string;
  name: string;
  checkItems: TaskCheckItem[];
}

export interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  mimeType?: string;
  bytes?: number;
  previewUrl?: string;
  createdAt?: string;
  isImage?: boolean;
}

export interface TaskComment {
  id: string;
  text: string;
  createdAt: string;
  author: WorkspaceMember;
  attachments?: TaskAttachment[];
}

export interface BoardList {
  id: string;
  name: string;
  idBoard: string;
  accountId: string;
  accountIds?: string[];
  provider: ProviderId;
  closed?: boolean;
  pos?: number;
}

export interface TaskBoard {
  id: string;
  name: string;
  desc?: string;
  url?: string;
  closed?: boolean;
  provider: ProviderId;
  accountId: string;
  accountLabel: string;
  accountColor: string;
  accountIds?: string[];
  workspaceId?: string;
  workspaceName?: string;
  prefs?: {
    backgroundColor?: string;
    backgroundImage?: string;
    background?: string;
  };
}

export type AsanaSection = 'today' | 'upcoming' | 'later' | 'overdue' | 'completed';

export interface TaskInterface {
  id: string;
  name: string;
  desc: string;
  due: string | null; // ISO string
  dueComplete: boolean;
  idBoard: string;
  idList: string;
  closed?: boolean;
  idMembers: string[];
  labels: TaskLabel[];
  url: string;
  dateLastActivity?: string;
  checklists?: TaskChecklist[];
  attachments?: TaskAttachment[];
  comments?: TaskComment[];
  commentsCount?: number;

  // Multi-provider, multi-account & Asana enriched fields
  provider: ProviderId;
  accountId: string;
  accountLabel: string;
  accountColor: string;
  accountIds?: string[];
  boardName: string;
  boardColor: string;
  listName: string;
  assignedMembers: WorkspaceMember[];
  section: AsanaSection;
}

export type ViewMode = 'dashboard' | 'list' | 'board' | 'calendar';

export type FilterSection = 'all' | 'my-tasks' | 'today' | 'upcoming' | 'overdue' | 'completed';
