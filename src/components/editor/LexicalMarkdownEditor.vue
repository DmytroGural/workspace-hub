<script setup lang="ts">
import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { createEmptyHistoryState, registerHistory } from '@lexical/history';
import {
  $isLinkNode,
  $toggleLink,
  AutoLinkNode,
  LinkNode,
  TOGGLE_LINK_COMMAND,
} from '@lexical/link';
import {
  $isListNode,
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListItemNode,
  ListNode,
  registerCheckList,
  registerList,
} from '@lexical/list';
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  registerMarkdownShortcuts,
  TRANSFORMERS,
} from '@lexical/markdown';
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
  HeadingNode,
  QuoteNode,
  registerRichText,
} from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import { mergeRegister } from '@lexical/utils';
import {
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  createEditor,
  FORMAT_TEXT_COMMAND,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
  type LexicalEditor,
  SELECTION_CHANGE_COMMAND,
  TextNode,
} from 'lexical';
import {
  Bold,
  CheckSquare,
  Code,
  Heading1,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
} from 'lucide-vue-next';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { WorkspaceMember } from '@/types/domain';
import { $createMentionNode, $isMentionNode, MentionNode } from './MentionNode';

const props = withDefaults(
  defineProps<{
    id?: string;
    modelValue: string;
    resetKey?: string;
    editable?: boolean;
    placeholder?: string;
    variant?: 'drawer' | 'stacked' | 'compact';
    borderless?: boolean;
    submitOnCtrlEnter?: boolean;
    mentionMembers?: WorkspaceMember[];
  }>(),
  {
    id: undefined,
    resetKey: '',
    editable: true,
    placeholder: '',
    variant: 'drawer',
    borderless: false,
    submitOnCtrlEnter: false,
    mentionMembers: () => [],
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
  blur: [];
  submit: [];
  paste: [event: ClipboardEvent];
}>();

const containerRef = ref<HTMLElement | null>(null);
const editorRootRef = ref<HTMLDivElement | null>(null);
const linkInputRef = ref<HTMLInputElement | null>(null);

const isFocused = ref(false);
const isEmpty = ref(true);
const showLinkInput = ref(false);
const linkUrl = ref('');

interface MentionMatch {
  query: string;
  startOffset: number;
  endOffset: number;
  nodeKey: string;
}

const MENTION_TRIGGER_RE = /(?:^|\s)@([a-zA-Z0-9._-]*)$/;
const MENTION_MATCH_RE = /(?:^|(?<=\s))@([a-zA-Z0-9._-]+)/g;
const mentionMatch = ref<MentionMatch | null>(null);
const mentionSelectedIndex = ref(0);
const mentionCoords = ref<{ top: number; left: number }>({ top: 36, left: 12 });
const activeMentionTooltip = ref<{ member: WorkspaceMember; top: number; left: number } | null>(
  null,
);

const mentionMemberMap = computed(() => {
  const map = new Map<string, WorkspaceMember>();
  for (const member of props.mentionMembers) {
    if (member.username) {
      map.set(member.username.toLowerCase(), member);
    }
  }
  return map;
});

const mentionSuggestions = computed(() => {
  if (!mentionMatch.value || !props.editable || props.mentionMembers.length === 0) {
    return [];
  }
  const q = mentionMatch.value.query.toLowerCase();
  return props.mentionMembers
    .filter(
      (m) => m.username.toLowerCase().includes(q) || Boolean(m.fullName?.toLowerCase().includes(q)),
    )
    .slice(0, 8);
});

const activeFormats = ref({
  bold: false,
  italic: false,
  strikethrough: false,
  code: false,
  link: false,
  blockType: 'paragraph' as string,
});

const surfaceClasses = computed(() => {
  if (props.borderless) {
    return 'lexical-editor-surface w-full text-xs text-gray-700 outline-none leading-relaxed';
  }
  if (props.variant === 'compact') {
    return 'lexical-editor-surface w-full px-2.5 py-2 text-xs text-gray-800 outline-none min-h-[60px] max-h-52 overflow-y-auto leading-relaxed';
  }
  return 'lexical-editor-surface w-full px-3 py-2.5 text-xs text-gray-800 outline-none min-h-[84px] max-h-72 overflow-y-auto leading-relaxed';
});

let editor: LexicalEditor | null = null;
let unregisterListeners: (() => void) | null = null;
let isApplyingExternal = false;
let lastEmittedMarkdown = props.modelValue || '';

const EDITOR_THEME = {
  paragraph: 'lexical-paragraph',
  heading: {
    h1: 'lexical-h1',
    h2: 'lexical-h2',
    h3: 'lexical-h3',
  },
  quote: 'lexical-quote',
  list: {
    ul: 'lexical-ul',
    ol: 'lexical-ol',
    listitem: 'lexical-li',
    listitemChecked: 'lexical-li-checked',
    listitemUnchecked: 'lexical-li-unchecked',
    nested: {
      listitem: 'lexical-nested-li',
    },
  },
  text: {
    bold: 'font-semibold',
    italic: 'italic',
    strikethrough: 'line-through',
    code: 'lexical-inline-code',
  },
  code: 'lexical-code-block',
  link: 'lexical-link',
};

function computeIsEmpty(): boolean {
  const root = $getRoot();
  if (root.getChildrenSize() > 1) return false;
  return root.getTextContent().trim().length === 0;
}

function updateToolbarState() {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return;

  const anchorNode = selection.anchor.getNode();
  const element =
    anchorNode.getKey() === 'root' ? anchorNode : anchorNode.getTopLevelElementOrThrow();

  let blockType = element.getType();
  if ($isHeadingNode(element)) {
    blockType = element.getTag();
  } else if ($isListNode(element)) {
    blockType = element.getListType();
  }

  const parent = anchorNode.getParent();
  const isLink = $isLinkNode(parent) || $isLinkNode(anchorNode);

  activeFormats.value = {
    bold: selection.hasFormat('bold'),
    italic: selection.hasFormat('italic'),
    strikethrough: selection.hasFormat('strikethrough'),
    code: selection.hasFormat('code'),
    link: isLink,
    blockType,
  };
}

function updateMentionPosition() {
  const domSelection = window.getSelection();
  const container = containerRef.value;
  if (!domSelection || domSelection.rangeCount === 0 || !container) return;

  const rect = domSelection.getRangeAt(0).getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0 && rect.top === 0 && rect.left === 0) return;

  const containerRect = container.getBoundingClientRect();
  const left = Math.max(8, Math.min(rect.left - containerRect.left, containerRect.width - 230));
  const top = rect.bottom - containerRect.top + 4;
  mentionCoords.value = { top, left };
}

function updateMentionMatch() {
  if (!props.editable || props.mentionMembers.length === 0) {
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

function refreshMentionNodes() {
  if (!editor) return;
  isApplyingExternal = true;
  try {
    editor.update(() => {
      const textNodes = $getRoot().getAllTextNodes();
      for (const node of textNodes) {
        node.markDirty();
      }
    });
  } finally {
    isApplyingExternal = false;
  }
}

function applyMarkdownToEditor(markdown: string) {
  if (!editor) return;
  isApplyingExternal = true;
  try {
    editor.update(() => {
      $convertFromMarkdownString(markdown || '', TRANSFORMERS);
      isEmpty.value = computeIsEmpty();
    });
    lastEmittedMarkdown = markdown || '';
  } finally {
    isApplyingExternal = false;
  }
}

onMounted(() => {
  const rootEl = editorRootRef.value;
  if (!rootEl) return;

  editor = createEditor({
    namespace: 'WorkspaceHubLexicalMarkdown',
    editable: props.editable,
    theme: EDITOR_THEME,
    nodes: [
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      CodeNode,
      CodeHighlightNode,
      LinkNode,
      AutoLinkNode,
      MentionNode,
    ],
    onError(error: Error) {
      throw error;
    },
  });

  editor.setRootElement(rootEl);

  unregisterListeners = mergeRegister(
    registerRichText(editor),
    registerHistory(editor, createEmptyHistoryState(), 300),
    registerList(editor),
    registerCheckList(editor),
    registerMarkdownShortcuts(editor, TRANSFORMERS),
    editor.registerNodeTransform(TextNode, transformTextNodeToMention),
    editor.registerNodeTransform(MentionNode, transformMentionNodeIfInvalid),
    editor.registerCommand(
      TOGGLE_LINK_COMMAND,
      (payload) => {
        if (typeof payload === 'string' || payload === null) {
          $toggleLink(payload, { target: '_blank', rel: 'noopener noreferrer' });
        }
        return true;
      },
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        updateToolbarState();
        updateMentionMatch();
        return false;
      },
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      KEY_ARROW_DOWN_COMMAND,
      (event) => {
        if (mentionSuggestions.value.length === 0) return false;
        event?.preventDefault();
        mentionSelectedIndex.value =
          (mentionSelectedIndex.value + 1) % mentionSuggestions.value.length;
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    ),
    editor.registerCommand(
      KEY_ARROW_UP_COMMAND,
      (event) => {
        if (mentionSuggestions.value.length === 0) return false;
        event?.preventDefault();
        mentionSelectedIndex.value =
          (mentionSelectedIndex.value - 1 + mentionSuggestions.value.length) %
          mentionSuggestions.value.length;
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    ),
    editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        if (mentionSuggestions.value.length > 0) {
          const chosen = mentionSuggestions.value[mentionSelectedIndex.value];
          if (chosen) {
            event?.preventDefault();
            selectMention(chosen);
            return true;
          }
        }
        if (props.submitOnCtrlEnter && event && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          emit('submit');
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_HIGH,
    ),
    editor.registerCommand(
      KEY_TAB_COMMAND,
      (event) => {
        if (mentionSuggestions.value.length === 0) return false;
        const chosen = mentionSuggestions.value[mentionSelectedIndex.value];
        if (!chosen) return false;
        event.preventDefault();
        selectMention(chosen);
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    ),
    editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      () => {
        if (activeMentionTooltip.value) {
          activeMentionTooltip.value = null;
          return true;
        }
        if (!mentionMatch.value) return false;
        mentionMatch.value = null;
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    ),
    editor.registerUpdateListener(({ editorState, dirtyElements, dirtyLeaves }) => {
      editorState.read(() => {
        isEmpty.value = computeIsEmpty();
        updateToolbarState();
        updateMentionMatch();

        if (isApplyingExternal || (dirtyElements.size === 0 && dirtyLeaves.size === 0)) {
          return;
        }

        const markdown = $convertToMarkdownString(TRANSFORMERS);
        if (markdown !== lastEmittedMarkdown) {
          lastEmittedMarkdown = markdown;
          emit('update:modelValue', markdown);
        }
      });
    }),
  );

  rootEl.addEventListener('click', handleEditorClick);
  document.addEventListener('pointerdown', handleDocumentPointerDown);
  applyMarkdownToEditor(props.modelValue || '');
});

onBeforeUnmount(() => {
  editorRootRef.value?.removeEventListener('click', handleEditorClick);
  document.removeEventListener('pointerdown', handleDocumentPointerDown);
  unregisterListeners?.();
  unregisterListeners = null;
  editor?.setRootElement(null);
  editor = null;
});

watch(
  () => props.mentionMembers,
  () => {
    refreshMentionNodes();
  },
);

watch(
  () => props.editable,
  (editable) => {
    editor?.setEditable(editable);
  },
);

watch(
  () => [props.resetKey, props.modelValue] as const,
  ([newKey, newVal], prev) => {
    const isNewContext = !prev || prev[0] !== newKey;
    const normalized = newVal || '';
    if (isNewContext || (!isFocused.value && normalized !== lastEmittedMarkdown)) {
      applyMarkdownToEditor(normalized);
    }
  },
);

function formatText(format: 'bold' | 'italic' | 'strikethrough' | 'code') {
  if (!editor || !props.editable) return;
  editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
}

function toggleHeading(tag: 'h1' | 'h2') {
  if (!editor || !props.editable) return;
  editor.update(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;
    if (activeFormats.value.blockType === tag) {
      $setBlocksType(selection, () => $createParagraphNode());
    } else {
      $setBlocksType(selection, () => $createHeadingNode(tag));
    }
  });
}

function toggleQuote() {
  if (!editor || !props.editable) return;
  editor.update(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;
    const anchorNode = selection.anchor.getNode();
    const element =
      anchorNode.getKey() === 'root' ? anchorNode : anchorNode.getTopLevelElementOrThrow();
    if ($isQuoteNode(element)) {
      $setBlocksType(selection, () => $createParagraphNode());
    } else {
      $setBlocksType(selection, () => $createQuoteNode());
    }
  });
}

function toggleList(type: 'bullet' | 'number' | 'check') {
  if (!editor || !props.editable) return;
  if (type === 'bullet') {
    editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
  } else if (type === 'number') {
    editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
  } else {
    editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
  }
}

function openLinkEditor() {
  if (!editor || !props.editable) return;
  if (activeFormats.value.link) {
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    showLinkInput.value = false;
    return;
  }
  linkUrl.value = 'https://';
  showLinkInput.value = true;
  void nextTick().then(() => {
    linkInputRef.value?.focus();
    linkInputRef.value?.select();
  });
}

function applyLink() {
  if (!editor) return;
  const trimmed = linkUrl.value.trim();
  if (trimmed && trimmed !== 'https://') {
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, trimmed);
  }
  showLinkInput.value = false;
  editorRootRef.value?.focus();
}

function handleEditorClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  const mentionEl = target?.closest<HTMLElement>('.lexical-mention[data-mention-username]');
  if (mentionEl) {
    const username = mentionEl.dataset.mentionUsername;
    const member = username ? mentionMemberMap.value.get(username.toLowerCase()) : undefined;
    const container = containerRef.value;
    if (member && container) {
      const rect = mentionEl.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const left = Math.max(8, Math.min(rect.left - containerRect.left, containerRect.width - 240));
      const top = rect.bottom - containerRect.top + 6;
      activeMentionTooltip.value = { member, top, left };
      return;
    }
  }

  activeMentionTooltip.value = null;
  const anchor = target?.closest('a');
  if (!anchor?.href) return;
  if (!props.editable || event.metaKey || event.ctrlKey) {
    event.preventDefault();
    window.open(anchor.href, '_blank', 'noopener,noreferrer');
  }
}

function handleDocumentPointerDown(event: PointerEvent) {
  if (!activeMentionTooltip.value) return;
  const target = event.target as Node | null;
  if (target && containerRef.value?.contains(target)) {
    const el = target instanceof HTMLElement ? target : target.parentElement;
    if (el?.closest('.lexical-mention') || el?.closest('[role="tooltip"]')) {
      return;
    }
  }
  activeMentionTooltip.value = null;
}

function handleFocusIn() {
  isFocused.value = true;
}

function handleFocusOut(event: FocusEvent) {
  const nextTarget = event.relatedTarget as Node | null;
  if (nextTarget && containerRef.value?.contains(nextTarget)) {
    return;
  }
  isFocused.value = false;
  showLinkInput.value = false;
  mentionMatch.value = null;
  emit('blur');
}
</script>

<template>
  <div
    ref="containerRef"
    :class="
      borderless
        ? 'relative'
        : [
            'relative rounded-lg border transition-colors',
            variant === 'stacked' || variant === 'compact' ? 'bg-white' : 'bg-gray-50/70',
            isFocused && editable
              ? 'bg-white border-modern-primary ring-1 ring-modern-primary'
              : variant === 'stacked'
                ? 'border-gray-300'
                : 'border-gray-200 hover:bg-gray-100/50',
          ]
    "
    @focusin="handleFocusIn"
    @focusout="handleFocusOut"
  >
    <!-- Compact Markdown Toolbar -->
    <div
      v-if="editable"
      class="flex items-center justify-between gap-1 px-2 py-1 border-b border-gray-200/80 bg-gray-50/90 rounded-t-lg flex-wrap"
    >
      <div class="flex items-center gap-0.5 flex-wrap">
        <button
          type="button"
          title="Bold (**text**)"
          @mousedown.prevent="formatText('bold')"
          :class="[
            'p-1 rounded text-gray-600 hover:bg-gray-200/70 transition-colors',
            activeFormats.bold ? 'bg-indigo-100 text-modern-primary' : '',
          ]"
        >
          <Bold class="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Italic (*text*)"
          @mousedown.prevent="formatText('italic')"
          :class="[
            'p-1 rounded text-gray-600 hover:bg-gray-200/70 transition-colors',
            activeFormats.italic ? 'bg-indigo-100 text-modern-primary' : '',
          ]"
        >
          <Italic class="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Strikethrough (~~text~~)"
          @mousedown.prevent="formatText('strikethrough')"
          :class="[
            'p-1 rounded text-gray-600 hover:bg-gray-200/70 transition-colors',
            activeFormats.strikethrough ? 'bg-indigo-100 text-modern-primary' : '',
          ]"
        >
          <Strikethrough class="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Inline code (`code`)"
          @mousedown.prevent="formatText('code')"
          :class="[
            'p-1 rounded text-gray-600 hover:bg-gray-200/70 transition-colors',
            activeFormats.code ? 'bg-indigo-100 text-modern-primary' : '',
          ]"
        >
          <Code class="w-3.5 h-3.5" />
        </button>

        <span class="w-px h-3.5 bg-gray-200 mx-1" />

        <button
          type="button"
          title="Heading 1 (# )"
          @mousedown.prevent="toggleHeading('h1')"
          :class="[
            'p-1 rounded text-gray-600 hover:bg-gray-200/70 transition-colors',
            activeFormats.blockType === 'h1' ? 'bg-indigo-100 text-modern-primary' : '',
          ]"
        >
          <Heading1 class="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Heading 2 (## )"
          @mousedown.prevent="toggleHeading('h2')"
          :class="[
            'p-1 rounded text-gray-600 hover:bg-gray-200/70 transition-colors',
            activeFormats.blockType === 'h2' ? 'bg-indigo-100 text-modern-primary' : '',
          ]"
        >
          <Heading2 class="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Quote (> )"
          @mousedown.prevent="toggleQuote"
          :class="[
            'p-1 rounded text-gray-600 hover:bg-gray-200/70 transition-colors',
            activeFormats.blockType === 'quote' ? 'bg-indigo-100 text-modern-primary' : '',
          ]"
        >
          <Quote class="w-3.5 h-3.5" />
        </button>

        <span class="w-px h-3.5 bg-gray-200 mx-1" />

        <button
          type="button"
          title="Bullet list (- )"
          @mousedown.prevent="toggleList('bullet')"
          :class="[
            'p-1 rounded text-gray-600 hover:bg-gray-200/70 transition-colors',
            activeFormats.blockType === 'bullet' ? 'bg-indigo-100 text-modern-primary' : '',
          ]"
        >
          <List class="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Numbered list (1. )"
          @mousedown.prevent="toggleList('number')"
          :class="[
            'p-1 rounded text-gray-600 hover:bg-gray-200/70 transition-colors',
            activeFormats.blockType === 'number' ? 'bg-indigo-100 text-modern-primary' : '',
          ]"
        >
          <ListOrdered class="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Checklist (- [ ] )"
          @mousedown.prevent="toggleList('check')"
          :class="[
            'p-1 rounded text-gray-600 hover:bg-gray-200/70 transition-colors',
            activeFormats.blockType === 'check' ? 'bg-indigo-100 text-modern-primary' : '',
          ]"
        >
          <CheckSquare class="w-3.5 h-3.5" />
        </button>

        <span class="w-px h-3.5 bg-gray-200 mx-1" />

        <button
          type="button"
          :title="activeFormats.link ? 'Remove link' : 'Insert link'"
          @mousedown.prevent="openLinkEditor"
          :class="[
            'p-1 rounded text-gray-600 hover:bg-gray-200/70 transition-colors',
            activeFormats.link ? 'bg-indigo-100 text-modern-primary' : '',
          ]"
        >
          <Link2 class="w-3.5 h-3.5" />
        </button>
      </div>

      <span class="text-[10px] font-medium text-gray-400 px-1 select-none">MD</span>
    </div>

    <!-- Inline Link URL Popover -->
    <div
      v-if="showLinkInput && editable"
      class="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50/70 border-b border-indigo-100"
    >
      <input
        ref="linkInputRef"
        v-model="linkUrl"
        type="url"
        placeholder="https://example.com"
        class="flex-1 px-2 py-1 text-xs bg-white border border-gray-300 rounded focus:outline-none focus:border-modern-primary"
        @keydown.enter.prevent="applyLink"
        @keydown.escape.prevent="showLinkInput = false"
      >
      <button
        type="button"
        class="px-2 py-1 text-[11px] font-medium bg-modern-primary text-white rounded hover:bg-modern-hover"
        @mousedown.prevent="applyLink"
      >
        Apply
      </button>
      <button
        type="button"
        class="px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-200/60 rounded"
        @mousedown.prevent="showLinkInput = false"
      >
        Cancel
      </button>
    </div>

    <!-- Lexical ContentEditable Surface -->
    <div class="relative">
      <div
        v-if="isEmpty && placeholder"
        :class="[
          'pointer-events-none absolute text-xs text-gray-400 select-none',
          variant === 'compact' ? 'top-2 left-2.5 right-2.5' : 'top-2.5 left-3 right-3',
        ]"
      >
        {{ placeholder }}
      </div>
      <div
        :id="id"
        ref="editorRootRef"
        :contenteditable="editable"
        :tabindex="editable ? 0 : -1"
        role="textbox"
        aria-multiline="true"
        :class="surfaceClasses"
        @paste="emit('paste', $event)"
      />
    </div>

    <!-- @mention Suggestions Dropdown -->
    <div
      v-if="mentionSuggestions.length > 0"
      role="listbox"
      aria-label="Mention suggestions"
      :style="{ top: `${mentionCoords.top}px`, left: `${mentionCoords.left}px` }"
      class="absolute z-40 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-1 max-h-48 overflow-y-auto"
    >
      <button
        v-for="(member, idx) in mentionSuggestions"
        :key="member.id"
        type="button"
        role="option"
        :aria-selected="idx === mentionSelectedIndex"
        @mousedown.prevent="selectMention(member)"
        @mouseenter="mentionSelectedIndex = idx"
        :class="[
          'w-full px-2.5 py-1.5 flex items-center gap-2 text-left text-xs transition-colors',
          idx === mentionSelectedIndex
            ? 'bg-indigo-50 text-modern-primary'
            : 'text-gray-700 hover:bg-gray-50',
        ]"
      >
        <img
          v-if="member.avatarUrl"
          :src="member.avatarUrl"
          :alt="member.fullName"
          class="w-5 h-5 rounded-full object-cover shrink-0"
        >
        <span
          v-else
          class="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-semibold flex items-center justify-center shrink-0"
        >
          {{ member.initials || member.username.slice(0, 2).toUpperCase() }}
        </span>
        <div class="min-w-0 flex-1">
          <div class="font-medium truncate leading-tight">{{ member.fullName }}</div>
          <div class="text-[10px] text-gray-400 truncate">@{{ member.username }}</div>
        </div>
      </button>
    </div>

    <!-- User Profile Tooltip on Mention Click -->
    <div
      v-if="activeMentionTooltip"
      role="tooltip"
      :style="{ top: `${activeMentionTooltip.top}px`, left: `${activeMentionTooltip.left}px` }"
      class="absolute z-40 w-60 bg-white border border-gray-200 rounded-xl shadow-xl p-3 flex items-center gap-2.5"
    >
      <img
        v-if="activeMentionTooltip.member.avatarUrl"
        :src="activeMentionTooltip.member.avatarUrl"
        :alt="activeMentionTooltip.member.fullName"
        class="w-9 h-9 rounded-full object-cover shrink-0 border border-gray-200"
      >
      <span
        v-else
        class="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0"
      >
        {{
          activeMentionTooltip.member.initials ||
          activeMentionTooltip.member.username.slice(0, 2).toUpperCase()
        }}
      </span>
      <div class="min-w-0 flex-1">
        <div class="text-xs font-semibold text-gray-900 truncate">
          {{ activeMentionTooltip.member.fullName }}
        </div>
        <div class="text-[11px] text-modern-primary font-medium truncate">
          @{{ activeMentionTooltip.member.username }}
        </div>
        <div class="text-[10px] text-gray-400 font-mono truncate mt-0.5">
          ID: {{ activeMentionTooltip.member.id }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lexical-editor-surface :deep(.lexical-paragraph) {
  margin: 0 0 0.25rem 0;
}
.lexical-editor-surface :deep(.lexical-paragraph:last-child) {
  margin-bottom: 0;
}
.lexical-editor-surface :deep(.lexical-h1) {
  font-size: 1rem;
  font-weight: 700;
  color: #111827;
  margin: 0.375rem 0 0.25rem;
}
.lexical-editor-surface :deep(.lexical-h2) {
  font-size: 0.875rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0.375rem 0 0.25rem;
}
.lexical-editor-surface :deep(.lexical-h3) {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #374151;
  margin: 0.25rem 0;
}
.lexical-editor-surface :deep(.lexical-quote) {
  border-left: 3px solid #cbd5e1;
  padding-left: 0.625rem;
  margin: 0.25rem 0;
  color: #4b5563;
  font-style: italic;
}
.lexical-editor-surface :deep(.lexical-ul) {
  list-style-type: disc;
  padding-left: 1.25rem;
  margin: 0.25rem 0;
}
.lexical-editor-surface :deep(.lexical-ol) {
  list-style-type: decimal;
  padding-left: 1.25rem;
  margin: 0.25rem 0;
}
.lexical-editor-surface :deep(.lexical-li) {
  margin: 0.125rem 0;
}
.lexical-editor-surface :deep(.lexical-li-checked),
.lexical-editor-surface :deep(.lexical-li-unchecked) {
  position: relative;
  list-style-type: none;
  padding-left: 1.35rem;
  margin: 0.125rem 0;
  outline: none;
}
.lexical-editor-surface :deep(.lexical-li-checked)::before,
.lexical-editor-surface :deep(.lexical-li-unchecked)::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.2rem;
  width: 0.875rem;
  height: 0.875rem;
  border-radius: 0.25rem;
  border: 1px solid #9ca3af;
  background-color: #ffffff;
  cursor: pointer;
}
.lexical-editor-surface :deep(.lexical-li-checked)::before {
  background-color: #4573d2;
  border-color: #4573d2;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='white'%3E%3Cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3E%3C/svg%3E");
  background-size: 100% 100%;
}
.lexical-editor-surface :deep(.lexical-li-checked) {
  text-decoration: line-through;
  color: #6b7280;
}
.lexical-editor-surface :deep(.lexical-inline-code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.7rem;
  background-color: #f3f4f6;
  color: #be185d;
  padding: 0.0625rem 0.25rem;
  border-radius: 0.25rem;
}
.lexical-editor-surface :deep(.lexical-code-block) {
  display: block;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.7rem;
  background-color: #1f2937;
  color: #f9fafb;
  padding: 0.5rem 0.625rem;
  border-radius: 0.375rem;
  margin: 0.25rem 0;
  overflow-x: auto;
  white-space: pre;
}
.lexical-editor-surface :deep(.lexical-link) {
  color: #4573d2;
  text-decoration: underline;
  cursor: pointer;
}
.lexical-editor-surface :deep(.lexical-mention) {
  color: #4573d2;
  background-color: #eef2ff;
  border-radius: 0.25rem;
  padding: 0.0625rem 0.25rem;
  font-weight: 500;
  text-decoration: underline;
  text-decoration-color: rgba(69, 115, 210, 0.35);
  text-underline-offset: 2px;
  cursor: pointer;
}
.lexical-editor-surface :deep(.lexical-mention:hover) {
  background-color: #e0e7ff;
  text-decoration-color: #4573d2;
}
</style>
