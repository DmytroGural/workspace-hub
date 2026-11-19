import type { TaskChecklist } from '@/types/domain';

export interface TrelloRawLabel {
  id: string;
  idBoard?: string;
  name?: string;
  color?: string | null;
}

export interface TrelloRawMember {
  id: string;
  fullName?: string;
  username?: string;
  avatarUrl?: string | null;
  initials?: string;
}

export interface TrelloRawOrganization {
  id?: string;
  name?: string;
  displayName?: string;
}

export interface TrelloRawBoardPrefs {
  backgroundColor?: string;
  backgroundImage?: string;
  background?: string;
}

export interface TrelloRawBoard {
  id: string;
  name: string;
  desc?: string;
  url?: string;
  closed?: boolean;
  idOrganization?: string;
  organization?: TrelloRawOrganization | null;
  prefs?: TrelloRawBoardPrefs;
}

export interface TrelloRawList {
  id: string;
  name: string;
  closed?: boolean;
  pos?: number;
}

export interface TrelloRawAttachmentPreview {
  url?: string;
  width?: number;
}

export interface TrelloRawAttachment {
  id: string;
  name?: string;
  url?: string;
  mimeType?: string;
  bytes?: number;
  date?: string;
  previews?: TrelloRawAttachmentPreview[];
}

export interface TrelloRawCardBadges {
  comments?: number;
}

export interface TrelloRawCard {
  id: string;
  name: string;
  desc?: string;
  due?: string | null;
  dueComplete?: boolean;
  idBoard: string;
  idList: string;
  closed?: boolean;
  idMembers?: string[];
  labels?: TrelloRawLabel[];
  url: string;
  dateLastActivity?: string;
  checklists?: TaskChecklist[];
  attachments?: TrelloRawAttachment[];
  members?: TrelloRawMember[];
  badges?: TrelloRawCardBadges;
}

export interface TrelloRawCreatedCard {
  id: string;
  url: string;
}

export interface TrelloRawCommentAction {
  id: string;
  date?: string;
  idMemberCreator?: string;
  memberCreator?: TrelloRawMember;
  data?: {
    text?: string;
  };
}
