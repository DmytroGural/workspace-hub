import type {
  ProviderAccount,
  TaskAttachment,
  TaskComment,
  TaskInterface,
  WorkspaceMember,
} from '@/types/domain';
import { nowIso } from '@/utils/dateUtils';
import {
  assertCapability,
  getActiveConnector,
  getCapabilities,
  localId,
  runOptimisticUpdate,
} from './taskHelpers';

export class TaskCollaborationService {
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
    assertCapability(account, 'canManageAttachments', 'Attachments', task.provider);

    const connector = getActiveConnector(account);
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
    assertCapability(account, 'canManageAttachments', 'Removing attachments', task.provider);

    const previous = [...(task.attachments || [])];

    await runOptimisticUpdate({
      account,
      apply: () => {
        task.attachments = previous.filter((a) => a.id !== attachmentId);
      },
      rollback: () => {
        task.attachments = previous;
      },
      remote: (connector) => connector.deleteAttachment?.(task.id, attachmentId),
      missingMethodMessage: `Provider "${account?.provider}" does not implement attachment deletion`,
    });
  }

  async loadTaskComments(task: TaskInterface, account?: ProviderAccount): Promise<TaskComment[]> {
    if (!getCapabilities(account).canComment) return task.comments || [];
    const connector = getActiveConnector(account);
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
    assertCapability(account, 'canComment', 'Comments', task.provider);

    const uploadedAttachments: TaskAttachment[] = [];
    for (const file of files) {
      const uploaded = await this.uploadTaskAttachment(task, file, account);
      uploadedAttachments.push(uploaded);
    }

    const trimmed = text.trim();
    const connector = getActiveConnector(account);
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

  async updateTaskComment(
    task: TaskInterface,
    commentId: string,
    text: string,
    account?: ProviderAccount,
  ): Promise<TaskComment> {
    assertCapability(account, 'canComment', 'Comments', task.provider);

    const existingList = task.comments || [];
    const target = existingList.find((c) => c.id === commentId);
    if (!target) {
      throw new Error('Comment not found');
    }

    const trimmed = text.trim();
    if (!trimmed && (!target.attachments || target.attachments.length === 0)) {
      throw new Error('Comment text cannot be empty');
    }

    const connector = getActiveConnector(account);
    let updated: TaskComment;

    if (connector) {
      if (!connector.updateCardComment) {
        throw new Error(`Provider "${account?.provider}" does not implement editing comments`);
      }
      updated = await connector.updateCardComment(task.id, commentId, trimmed, target.attachments);
    } else {
      updated = {
        ...target,
        text: trimmed,
      };
    }

    const enriched = this.enrichCommentAttachments(task, [updated])[0] || updated;
    task.comments = existingList.map((c) => (c.id === commentId ? enriched : c));
    return enriched;
  }

  async deleteTaskComment(
    task: TaskInterface,
    commentId: string,
    account?: ProviderAccount,
  ): Promise<void> {
    assertCapability(account, 'canComment', 'Comments', task.provider);

    const connector = getActiveConnector(account);
    if (connector) {
      if (!connector.deleteCardComment) {
        throw new Error(`Provider "${account?.provider}" does not implement deleting comments`);
      }
      await connector.deleteCardComment(task.id, commentId);
    }

    task.comments = (task.comments || []).filter((c) => c.id !== commentId);
    task.commentsCount = task.comments.length;
  }
}

export const taskCollaborationService = new TaskCollaborationService();
