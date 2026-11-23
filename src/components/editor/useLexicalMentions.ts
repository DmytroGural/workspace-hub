import {
  $createTextNode,
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  type LexicalEditor,
  type TextNode,
} from 'lexical';
import { computed, nextTick, onBeforeUnmount, type Ref, ref, watch } from 'vue';
import type { WorkspaceMember } from '@/types/domain';
import { $createMentionNode, $isMentionNode, type MentionNode } from './MentionNode';

interface MentionMatch {
  query: string;
  startOffset: number;
  endOffset: number;
  nodeKey: string;
}

const MENTION_TRIGGER_RE = /(?:^|\s)@([a-zA-Z0-9._-]*)$/;
const MENTION_MATCH_RE = /(?:^|(?<=\s))@([a-zA-Z0-9._-]+)/g;

export function useLexicalMentions(options: {
  containerRef: Ref<HTMLElement | null>;
  getEditor: () => LexicalEditor | null;
  isEditable: () => boolean;
  getMembers: () => WorkspaceMember[];
}) {
  const mentionMatch = ref<MentionMatch | null>(null);
  const mentionSelectedIndex = ref(0);
  const mentionCoords = ref<{ top: number; left: number }>({ top: 36, left: 12 });
  const activeMentionTooltip = ref<{ member: WorkspaceMember; top: number; left: number } | null>(
    null,
  );

  const mentionMemberMap = computed(() => {
    const map = new Map<string, WorkspaceMember>();
    for (const member of options.getMembers()) {
      if (member.username) {
        map.set(member.username.toLowerCase(), member);
      }
    }
    return map;
  });

  const mentionSuggestions = computed(() => {
    const members = options.getMembers();
    if (!mentionMatch.value || !options.isEditable() || members.length === 0) {
      return [];
    }
    const q = mentionMatch.value.query.toLowerCase();
    return members
      .filter(
        (m) =>
          m.username.toLowerCase().includes(q) || Boolean(m.fullName?.toLowerCase().includes(q)),
      )
      .slice(0, 8);
  });

  function updateMentionPosition() {
    const domSelection = window.getSelection();
    const container = options.containerRef.value;
    if (!domSelection || domSelection.rangeCount === 0 || !container) return;

    const rect = domSelection.getRangeAt(0).getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0 && rect.top === 0 && rect.left === 0) return;

    const containerRect = container.getBoundingClientRect();
    const left = Math.max(8, Math.min(rect.left - containerRect.left, containerRect.width - 230));
    const top = rect.bottom - containerRect.top + 4;
    mentionCoords.value = { top, left };
  }

  function updateMentionMatch() {
    if (!options.isEditable() || options.getMembers().length === 0) {
      mentionMatch.value = null;
      return;
    }

    const selection = $getSelection();
    if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
      mentionMatch.value = null;
      return;
    }

    const anchorNode = selection.anchor.getNode();
    if (!$isTextNode(anchorNode)) {
      mentionMatch.value = null;
      return;
    }

    const textBeforeCaret = anchorNode.getTextContent().slice(0, selection.anchor.offset);
    const match = textBeforeCaret.match(MENTION_TRIGGER_RE);
    if (!match) {
      mentionMatch.value = null;
      return;
    }

    const query = match[1] ?? '';
    const atIndex = textBeforeCaret.lastIndexOf('@');
    const prevQuery = mentionMatch.value?.query;

    mentionMatch.value = {
      query,
      startOffset: atIndex,
      endOffset: selection.anchor.offset,
      nodeKey: anchorNode.getKey(),
    };

    if (prevQuery !== query) {
      mentionSelectedIndex.value = 0;
    }
    void nextTick(updateMentionPosition);
  }

  function selectMention(member: WorkspaceMember) {
    const editor = options.getEditor();
    if (!editor || !mentionMatch.value) return;
    const activeMatch = mentionMatch.value;
    mentionMatch.value = null;

    editor.update(() => {
      const node = $getNodeByKey(activeMatch.nodeKey);
      if (!$isTextNode(node)) return;
      const text = node.getTextContent();
      const insertion = `@${member.username} `;
      const nextText =
        text.slice(0, activeMatch.startOffset) + insertion + text.slice(activeMatch.endOffset);
      node.setTextContent(nextText);
      const caretOffset = activeMatch.startOffset + insertion.length;
      node.select(caretOffset, caretOffset);
    });
  }

  function transformTextNodeToMention(node: TextNode) {
    if ($isMentionNode(node) || !node.isSimpleText()) return;
    if (node.getParent()?.getType() === 'code') return;

    const text = node.getTextContent();
    MENTION_MATCH_RE.lastIndex = 0;
    let match: RegExpExecArray | null = MENTION_MATCH_RE.exec(text);
    while (match !== null) {
      const username = match[1];
      const member = mentionMemberMap.value.get(username.toLowerCase());
      if (member) {
        const start = match.index;
        const end = start + match[0].length;
        const selection = $getSelection();
        const wasCaretInside =
          $isRangeSelection(selection) &&
          selection.isCollapsed() &&
          selection.anchor.key === node.getKey() &&
          selection.anchor.offset >= start &&
          selection.anchor.offset <= end;

        const splitNodes = start === 0 ? node.splitText(end) : node.splitText(start, end);
        const targetNode = start === 0 ? splitNodes[0] : splitNodes[1];
        if (targetNode) {
          const mentionNode = $createMentionNode(member.username, targetNode.getTextContent());
          targetNode.replace(mentionNode);
          if (wasCaretInside) {
            const len = mentionNode.getTextContentSize();
            mentionNode.select(len, len);
          }
        }
        return;
      }
      match = MENTION_MATCH_RE.exec(text);
    }
  }

  function transformMentionNodeIfInvalid(node: MentionNode) {
    const text = node.getTextContent();
    const match = text.match(/^@([a-zA-Z0-9._-]+)$/);
    const member = match ? mentionMemberMap.value.get(match[1].toLowerCase()) : undefined;
    if (!member) {
      const selection = $getSelection();
      const isSelected =
        $isRangeSelection(selection) &&
        selection.isCollapsed() &&
        selection.anchor.key === node.getKey();
      const offset = isSelected ? selection.anchor.offset : 0;
      const textNode = $createTextNode(text);
      node.replace(textNode);
      if (isSelected) {
        textNode.select(offset, offset);
      }
    }
  }

  function handleMentionClick(target: HTMLElement | null): boolean {
    const mentionEl = target?.closest<HTMLElement>('.lexical-mention[data-mention-username]');
    if (!mentionEl) {
      activeMentionTooltip.value = null;
      return false;
    }

    const username = mentionEl.dataset.mentionUsername;
    const member = username ? mentionMemberMap.value.get(username.toLowerCase()) : undefined;
    const container = options.containerRef.value;
    if (member && container) {
      const rect = mentionEl.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const left = Math.max(8, Math.min(rect.left - containerRect.left, containerRect.width - 240));
      const top = rect.bottom - containerRect.top + 6;
      activeMentionTooltip.value = { member, top, left };
      return true;
    }

    activeMentionTooltip.value = null;
    return false;
  }

  function handleDocumentPointerDown(event: PointerEvent) {
    if (!activeMentionTooltip.value) return;
    const target = event.target as Node | null;
    if (target && options.containerRef.value?.contains(target)) {
      const el = target instanceof HTMLElement ? target : target.parentElement;
      if (el?.closest('.lexical-mention') || el?.closest('[role="tooltip"]')) {
        return;
      }
    }
    activeMentionTooltip.value = null;
  }

  // Attach global pointerdown listener only while a mention tooltip is actually open
  watch(activeMentionTooltip, (tooltip, prev) => {
    if (tooltip && !prev) {
      document.addEventListener('pointerdown', handleDocumentPointerDown);
    } else if (!tooltip && prev) {
      document.removeEventListener('pointerdown', handleDocumentPointerDown);
    }
  });

  onBeforeUnmount(() => {
    document.removeEventListener('pointerdown', handleDocumentPointerDown);
  });

  function clearMentionState() {
    mentionMatch.value = null;
  }

  return {
    mentionMatch,
    mentionSelectedIndex,
    mentionCoords,
    mentionSuggestions,
    activeMentionTooltip,
    updateMentionMatch,
    selectMention,
    transformTextNodeToMention,
    transformMentionNodeIfInvalid,
    handleMentionClick,
    clearMentionState,
  };
}
