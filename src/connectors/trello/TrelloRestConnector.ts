import { BaseTaskProviderConnector } from '@/connectors/base/BaseTaskProviderConnector';
import { FetchHttpClient, HttpApiError } from '@/connectors/http/FetchHttpClient';
import type {
  AccountMeta,
  CreateCardPayload,
  CreatedCardResult,
  IHttpClient,
  UpdateCardPayload,
} from '@/types/api';
import type {
  BoardList,
  TaskAttachment,
  TaskBoard,
  TaskComment,
  TaskInterface,
  TaskLabel,
  WorkspaceMember,
} from '@/types/domain';
import { compareIsoDates } from '@/utils/dateUtils';
import {
  formatCommentTextWithAttachments,
  mapRawAttachment,
  mapRawBoard,
  mapRawCard,
  mapRawComment,
  mapRawLabel,
  mapRawList,
  mapRawMember,
} from './trelloMapper';
import type {
  TrelloRawAttachment,
  TrelloRawBoard,
  TrelloRawCard,
  TrelloRawCommentAction,
  TrelloRawCreatedCard,
  TrelloRawLabel,
  TrelloRawList,
  TrelloRawMember,
} from './trelloTypes';

const TRELLO_BASE_URL = 'https://api.trello.com/1';
const HEX_64_SECRET_RE = /^[0-9a-f]{64}$/i;

/**
 * Live Trello REST API v1 Connector implementing ITaskProviderApi.
 */
export class TrelloRestConnector extends BaseTaskProviderConnector {
  private readonly http: IHttpClient;
  private readonly apiToken: string;

  constructor(
    apiKey: string,
    token: string,
    meta: AccountMeta = {
      provider: 'trello',
      accountId: 'default',
      accountLabel: 'Trello',
      accountColor: '#4573d2',
    },
    httpClient?: IHttpClient,
  ) {
    super(meta);
    this.apiToken = token.trim();
    this.http =
      httpClient ||
      new FetchHttpClient(TRELLO_BASE_URL, {
        key: apiKey.trim(),
        token: this.apiToken,
      });
  }

  async testConnection(): Promise<WorkspaceMember> {
    try {
      const raw = await this.http.get<TrelloRawMember>('/members/me', {
        params: { fields: 'id,fullName,username,avatarUrl,initials' },
      });
      return mapRawMember(raw);
    } catch (err) {
      if (err instanceof HttpApiError && err.status === 401) {
        if (HEX_64_SECRET_RE.test(this.apiToken)) {
          throw new Error(
            '401 Unauthorized: You entered the 64-character API Secret instead of a user API Token (which starts with "ATTA..."). Click "Authorize & Get Token in Trello", click Allow, and paste the ATTA... token.',
          );
        }
        throw new Error(
          '401 Unauthorized: Invalid Trello API Key or API Token. Check that your API Key is 32 characters and your Token was generated via Allow (starts with "ATTA...").',
        );
      }
      throw err;
    }
  }

  async getMyBoards(): Promise<TaskBoard[]> {
    const rawBoards = await this.http.get<TrelloRawBoard[]>('/members/me/boards', {
      params: {
        filter: 'open',
        fields: 'id,name,desc,url,prefs,closed,idOrganization',
        organization: 'true',
        organization_fields: 'id,name,displayName',
      },
    });

    const candidates = [this.meta.workspaceName, this.meta.accountLabel]
      .map((s) => (s || '').trim().toLowerCase())
      .filter(Boolean);

    const matchesWorkspace = (b: TrelloRawBoard): boolean => {
      if (candidates.length === 0) return false;
      const org = b.organization;
      const orgName = (org?.name || '').trim().toLowerCase();
      const orgDisplay = (org?.displayName || '').trim().toLowerCase();
      const orgId = (org?.id || b.idOrganization || '').trim().toLowerCase();
      return candidates.some((c) => c === orgName || c === orgDisplay || c === orgId);
    };

    const hasMatchingOrg = rawBoards.some(matchesWorkspace);
    const filtered = hasMatchingOrg ? rawBoards.filter(matchesWorkspace) : rawBoards;

    return filtered.map((b) => mapRawBoard(b, this.meta));
  }

  async getListsForBoard(boardId: string): Promise<BoardList[]> {
    try {
      const rawLists = await this.http.get<TrelloRawList[]>(`/boards/${boardId}/lists`, {
        params: { fields: 'id,name,pos,closed' },
      });
      return rawLists.map((l) => mapRawList(l, boardId, this.meta));
    } catch {
      return [];
    }
  }

  private buildListMap(lists: BoardList[]): Map<string, string> {
    return new Map(lists.map((l) => [l.id, l.name]));
  }

  async getCardsForBoard(board: TaskBoard, lists: BoardList[]): Promise<TaskInterface[]> {
    const listMap = this.buildListMap(lists);

    try {
      const rawCards = await this.http.get<TrelloRawCard[]>(`/boards/${board.id}/cards`, {
        params: {
          filter: 'open',
          fields:
            'id,name,desc,due,dueComplete,idBoard,idList,idMembers,labels,url,pos,dateLastActivity,closed,badges',
          checklists: 'all',
          members: 'true',
          attachments: 'true',
          attachment_fields: 'id,name,url,mimeType,bytes,date,previews',
        },
      });
      return rawCards.map((c) => mapRawCard(c, board, listMap, this.meta));
    } catch {
      return [];
    }
  }

  async getCard(
    cardId: string,
    board: TaskBoard,
    lists: BoardList[],
  ): Promise<TaskInterface | null> {
    const raw = await this.http.get<TrelloRawCard | null>(`/cards/${cardId}`, {
      params: {
        fields:
          'id,name,desc,due,dueComplete,idBoard,idList,idMembers,labels,url,pos,dateLastActivity,closed,badges',
        checklists: 'all',
        members: 'true',
        attachments: 'true',
        attachment_fields: 'id,name,url,mimeType,bytes,date,previews',
      },
    });
    if (!raw?.id) return null;

    const listMap = this.buildListMap(lists);
    return mapRawCard(raw, board, listMap, this.meta);
  }

  async updateCardComplete(cardId: string, dueComplete: boolean): Promise<void> {
    await this.http.put(`/cards/${cardId}`, {
      params: { dueComplete },
    });
  }

  async updateCard(cardId: string, payload: UpdateCardPayload): Promise<void> {
    const hasCoreFields =
      payload.name !== undefined ||
      payload.desc !== undefined ||
      payload.due !== undefined ||
      payload.idList !== undefined ||
      payload.pos !== undefined ||
      payload.closed !== undefined;

    if (!hasCoreFields) return;

    await this.http.put(`/cards/${cardId}`, {
      params: {
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.desc !== undefined ? { desc: payload.desc } : {}),
        ...(payload.due !== undefined ? { due: payload.due || 'null' } : {}),
        ...(payload.idList !== undefined ? { idList: payload.idList } : {}),
        ...(payload.pos !== undefined ? { pos: payload.pos } : {}),
        ...(payload.closed !== undefined ? { closed: payload.closed } : {}),
      },
    });
  }

  async deleteCard(cardId: string): Promise<void> {
    await this.http.delete(`/cards/${cardId}`);
  }

  async createCard(payload: CreateCardPayload): Promise<CreatedCardResult> {
    const remote = await this.http.post<TrelloRawCreatedCard>('/cards', {
      params: {
        idList: payload.idList,
        name: payload.name,
        desc: payload.desc || '',
        ...(payload.due ? { due: payload.due } : {}),
        ...(payload.labelIds && payload.labelIds.length > 0
          ? { idLabels: payload.labelIds.join(',') }
          : {}),
        ...(payload.memberIds && payload.memberIds.length > 0
          ? { idMembers: payload.memberIds.join(',') }
          : {}),
      },
    });

    return {
      id: remote.id,
      url: remote.url,
    };
  }

  async getBoardLabels(boardId: string): Promise<TaskLabel[]> {
    const rawLabels = await this.http.get<TrelloRawLabel[]>(`/boards/${boardId}/labels`, {
      params: { fields: 'id,idBoard,name,color' },
    });
    return rawLabels.map((l) => mapRawLabel(l, boardId));
  }

  async createBoardLabel(boardId: string, name: string, color: string): Promise<TaskLabel> {
    const raw = await this.http.post<TrelloRawLabel>(`/boards/${boardId}/labels`, {
      params: { name, color },
    });
    return mapRawLabel(raw, boardId);
  }

  async toggleCardLabel(cardId: string, labelId: string, attach: boolean): Promise<void> {
    if (attach) {
      await this.http.post(`/cards/${cardId}/idLabels`, {
        params: { value: labelId },
      });
    } else {
      await this.http.delete(`/cards/${cardId}/idLabels/${labelId}`);
    }
  }

  async getBoardMembers(boardId: string): Promise<WorkspaceMember[]> {
    const rawMembers = await this.http.get<TrelloRawMember[]>(`/boards/${boardId}/members`, {
      params: { fields: 'id,fullName,username,avatarUrl,initials' },
    });
    return rawMembers.map(mapRawMember);
  }

  async toggleCardMember(cardId: string, memberId: string, assign: boolean): Promise<void> {
    if (assign) {
      await this.http.post(`/cards/${cardId}/idMembers`, {
        params: { value: memberId },
      });
    } else {
      await this.http.delete(`/cards/${cardId}/idMembers/${memberId}`);
    }
  }

  async getCardComments(cardId: string): Promise<TaskComment[]> {
    const rawActions = await this.http.get<TrelloRawCommentAction[]>(`/cards/${cardId}/actions`, {
      params: {
        filter: 'commentCard',
        fields: 'id,date,data,idMemberCreator',
        memberCreator: 'true',
        memberCreator_fields: 'id,fullName,username,avatarUrl,initials',
      },
    });
    return rawActions.map(mapRawComment).sort((a, b) => compareIsoDates(a.createdAt, b.createdAt));
  }

  async addCardComment(
    cardId: string,
    text: string,
    attachments?: TaskAttachment[],
  ): Promise<TaskComment> {
    const formattedText = formatCommentTextWithAttachments(text, attachments);
    const rawAction = await this.http.post<TrelloRawCommentAction>(
      `/cards/${cardId}/actions/comments`,
      {
        params: {
          text: formattedText,
        },
      },
    );
    const comment = mapRawComment(rawAction);
    if (attachments && attachments.length > 0) {
      comment.attachments = attachments;
    }
    return comment;
  }

  async updateCardComment(
    cardId: string,
    commentId: string,
    text: string,
    attachments?: TaskAttachment[],
  ): Promise<TaskComment> {
    const formattedText = formatCommentTextWithAttachments(text, attachments);
    const rawAction = await this.http.put<TrelloRawCommentAction>(
      `/cards/${cardId}/actions/${commentId}/comments`,
      {
        params: {
          text: formattedText,
        },
      },
    );
    const comment = mapRawComment(rawAction);
    if (attachments && attachments.length > 0) {
      comment.attachments = attachments;
    }
    return comment;
  }

  async deleteCardComment(cardId: string, commentId: string): Promise<void> {
    await this.http.delete(`/cards/${cardId}/actions/${commentId}/comments`);
  }

  async uploadAttachment(cardId: string, file: File): Promise<TaskAttachment> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('name', file.name);
    if (file.type) {
      formData.append('mimeType', file.type);
    }

    const raw = await this.http.post<TrelloRawAttachment>(`/cards/${cardId}/attachments`, {
      body: formData,
    });
    return mapRawAttachment(raw);
  }

  async deleteAttachment(cardId: string, attachmentId: string): Promise<void> {
    await this.http.delete(`/cards/${cardId}/attachments/${attachmentId}`);
  }

  async toggleCheckItem(
    cardId: string,
    checkItemId: string,
    state: 'complete' | 'incomplete',
  ): Promise<void> {
    await this.http.put(`/cards/${cardId}/checkItem/${checkItemId}`, {
      params: { state },
    });
  }
}
