import type { AccountMeta } from '@/types/api';
import type {
  BoardList,
  TaskAttachment,
  TaskBoard,
  TaskComment,
  TaskInterface,
  TaskLabel,
  WorkspaceMember,
} from '@/types/domain';
import { classifyTaskSection } from '@/utils/taskClassification';
import type {
  TrelloRawAttachment,
  TrelloRawBoard,
  TrelloRawCard,
  TrelloRawCommentAction,
  TrelloRawLabel,
  TrelloRawList,
  TrelloRawMember,
} from './trelloTypes';

export { classifyTaskSection as determineSection };

const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|svg|bmp|avif)(\?.*)?$/i;
const COMMENT_ATTACHMENT_LINE_RE = /^\[📎\s+([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/;

function isImageAttachment(name: string, mimeType?: string): boolean {
  if (mimeType?.toLowerCase().startsWith('image/')) return true;
  return IMAGE_EXT_RE.test(name);
}

export function mapRawLabel(raw: TrelloRawLabel, fallbackBoardId = ''): TaskLabel {
  return {
    id: raw.id,
    idBoard: raw.idBoard || fallbackBoardId,
    name: raw.name || '',
    color: raw.color || 'blue',
  };
}

export function mapRawMember(raw: TrelloRawMember): WorkspaceMember {
  return {
    id: raw.id,
    fullName: raw.fullName || raw.username || 'Member',
    username: raw.username || 'user',
    avatarUrl: raw.avatarUrl ? `${raw.avatarUrl}/50.png` : undefined,
    initials: raw.initials || raw.fullName?.slice(0, 2).toUpperCase(),
  };
}

export function mapRawBoard(raw: TrelloRawBoard, meta: AccountMeta): TaskBoard {
  const org = raw.organization;
  return {
    id: raw.id,
    name: raw.name,
    desc: raw.desc || '',
    url: raw.url,
    closed: !!raw.closed,
    provider: meta.provider,
    accountId: meta.accountId,
    accountLabel: meta.accountLabel,
    accountColor: meta.accountColor,
    workspaceId: raw.idOrganization || org?.id || undefined,
    workspaceName: org?.displayName || org?.name || undefined,
    prefs: {
      backgroundColor: raw.prefs?.backgroundColor || meta.accountColor || '#4573d2',
      background: raw.prefs?.background,
    },
  };
}

export function mapRawList(raw: TrelloRawList, boardId: string, meta: AccountMeta): BoardList {
  return {
    id: raw.id,
    name: raw.name,
    idBoard: boardId,
    accountId: meta.accountId,
    provider: meta.provider,
    closed: !!raw.closed,
    pos: raw.pos,
  };
}

export function mapRawAttachment(raw: TrelloRawAttachment): TaskAttachment {
  const name = raw.name || 'Attachment';
  const mimeType = raw.mimeType || undefined;
  const isImage = isImageAttachment(name, mimeType);
  const previews = Array.isArray(raw.previews) ? raw.previews : [];
  const bestPreview =
    previews.find((p) => p.url && (p.width ?? 0) >= 150)?.url ||
    previews[0]?.url ||
    (isImage ? raw.url : undefined);

  return {
    id: raw.id,
    name,
    url: raw.url || '',
    mimeType,
    bytes: typeof raw.bytes === 'number' ? raw.bytes : undefined,
    previewUrl: bestPreview,
    createdAt: raw.date || undefined,
    isImage,
  };
}

export function mapRawCard(
  raw: TrelloRawCard,
  board: TaskBoard,
  listMap: Map<string, string>,
  meta: AccountMeta,
): TaskInterface {
  const assignedMembers: WorkspaceMember[] = (raw.members || []).map(mapRawMember);
  const section = classifyTaskSection(raw.due || null, !!raw.dueComplete);

  return {
    id: raw.id,
    name: raw.name,
    desc: raw.desc || '',
    due: raw.due || null,
    dueComplete: !!raw.dueComplete,
    idBoard: raw.idBoard,
    idList: raw.idList,
    pos: typeof raw.pos === 'number' ? raw.pos : undefined,
    closed: !!raw.closed,
    idMembers: raw.idMembers || [],
    labels: (raw.labels || []).map((l) => mapRawLabel(l, raw.idBoard)),
    url: raw.url,
    dateLastActivity: raw.dateLastActivity,
    checklists: raw.checklists || [],
    attachments: (raw.attachments || []).map(mapRawAttachment),
    commentsCount: typeof raw.badges?.comments === 'number' ? raw.badges.comments : undefined,
    provider: meta.provider,
    accountId: meta.accountId,
    accountLabel: meta.accountLabel,
    accountColor: meta.accountColor,
    boardName: board.name,
    boardColor: board.prefs?.backgroundColor || '#4573d2',
    listName: listMap.get(raw.idList) || 'General',
    assignedMembers,
    section,
  };
}

export function formatCommentTextWithAttachments(
  text: string,
  attachments?: TaskAttachment[],
): string {
  const cleanText = text.trim();
  if (!attachments || attachments.length === 0) return cleanText;

  const attachmentLines = attachments.map((att) => `[📎 ${att.name}](${att.url})`).join('\n');
  return cleanText ? `${cleanText}\n\n${attachmentLines}` : attachmentLines;
}

function parseCommentTextAndAttachments(rawText: string): {
  text: string;
  attachments: TaskAttachment[];
} {
  const lines = rawText.split(/\r?\n/);
  const textLines: string[] = [];
  const attachments: TaskAttachment[] = [];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    const match = trimmed.match(COMMENT_ATTACHMENT_LINE_RE);
    if (match) {
      const name = match[1].trim();
      const url = match[2].trim();
      attachments.push({
        id: `cmt_att_${idx}_${name}`,
        name,
        url,
        isImage: isImageAttachment(name),
      });
    } else {
      textLines.push(line);
    }
  });

  return {
    text: textLines.join('\n').trim(),
    attachments,
  };
}

export function mapRawComment(raw: TrelloRawCommentAction): TaskComment {
  const creator = raw.memberCreator
    ? mapRawMember(raw.memberCreator)
    : {
        id: raw.idMemberCreator || 'member_unknown',
        fullName: 'Trello Member',
        username: 'member',
        initials: 'TM',
      };

  const parsed = parseCommentTextAndAttachments(raw.data?.text || '');

  return {
    id: raw.id,
    text: parsed.text,
    createdAt: raw.date || '',
    author: creator,
    attachments: parsed.attachments.length > 0 ? parsed.attachments : undefined,
  };
}
