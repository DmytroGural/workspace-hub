<script setup lang="ts">
import { createEmptyHistoryState, registerHistory } from '@lexical/history';
import { $isLinkNode, $toggleLink, TOGGLE_LINK_COMMAND } from '@lexical/link';
import {
  $isListNode,
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
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
  registerRichText,
} from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import { mergeRegister } from '@lexical/utils';
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
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
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { WorkspaceMember } from '@/types/domain';
import EditorToolbar from './EditorToolbar.vue';
import {
  type ActiveFormats,
  EDITOR_THEME,
  INITIAL_ACTIVE_FORMATS,
  LEXICAL_NODES,
} from './lexicalConfig';
import MentionDropdown from './MentionDropdown.vue';
import { MentionNode } from './MentionNode';
import MentionProfileTooltip from './MentionProfileTooltip.vue';
import { useLexicalMentions } from './useLexicalMentions';

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
const toolbarRef = ref<InstanceType<typeof EditorToolbar> | null>(null);

const isFocused = ref(false);
const isEmpty = ref(true);
const activeFormats = ref<ActiveFormats>({ ...INITIAL_ACTIVE_FORMATS });

const surfaceClasses = computed(() => {
  if (props.borderless) {
    return 'lexical-editor-surface w-full text-xs text-gray-700 outline-none leading-relaxed';
  }
  if (props.variant === 'compact') {
    return 'lexical-editor-surface w-full px-2.5 py-2 text-xs text-gray-800 outline-none min-h-[60px] max-h-52 overflow-y-auto leading-relaxed';
  }
  if (props.variant === 'stacked') {
    return 'lexical-editor-surface w-full px-3 py-2.5 text-xs text-gray-800 outline-none min-h-[84px] max-h-72 overflow-y-auto leading-relaxed';
  }
  return 'lexical-editor-surface w-full px-3 py-2.5 text-xs text-gray-800 outline-none min-h-[84px] leading-relaxed';
});

let editor: LexicalEditor | null = null;
let unregisterListeners: (() => void) | null = null;
let isApplyingExternal = false;
let lastEmittedMarkdown = props.modelValue || '';

const {
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
} = useLexicalMentions({
  containerRef,
  getEditor: () => editor,
  isEditable: () => props.editable,
  getMembers: () => props.mentionMembers,
});

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

function refreshMentionNodes() {
  if (!editor) return;
  isApplyingExternal = true;
  try {
    editor.update(() => {
      for (const node of $getRoot().getAllTextNodes()) {
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
    nodes: LEXICAL_NODES,
    onError(error: Error) {
      throw error;
    },
  });

  editor.setRootElement(rootEl);

  const registrations: Array<() => void> = [
    editor.registerNodeTransform(TextNode, transformTextNodeToMention),
    editor.registerNodeTransform(MentionNode, transformMentionNodeIfInvalid),
  ];

  // Skip heavy editing plugins and keyboard hooks for read-only markdown displays
  if (props.editable) {
    registrations.push(
      registerRichText(editor),
      registerHistory(editor, createEmptyHistoryState(), 300),
      registerList(editor),
      registerCheckList(editor),
      registerMarkdownShortcuts(editor, TRANSFORMERS),
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
          clearMentionState();
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
  }

  unregisterListeners = mergeRegister(...registrations);
  rootEl.addEventListener('click', handleEditorClick);
  applyMarkdownToEditor(props.modelValue || '');
});

onBeforeUnmount(() => {
  editorRootRef.value?.removeEventListener('click', handleEditorClick);
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
    $setBlocksType(selection, () =>
      activeFormats.value.blockType === tag ? $createParagraphNode() : $createHeadingNode(tag),
    );
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
    $setBlocksType(selection, () =>
      $isQuoteNode(element) ? $createParagraphNode() : $createQuoteNode(),
    );
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

function handleApplyLink(url: string | null) {
  if (!editor || !props.editable) return;
  editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
  editorRootRef.value?.focus();
}

function handleEditorClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  if (handleMentionClick(target)) return;

  const anchor = target?.closest('a');
  if (!anchor?.href) return;
  if (!props.editable || event.metaKey || event.ctrlKey) {
    event.preventDefault();
    window.open(anchor.href, '_blank', 'noopener,noreferrer');
  }
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
  toolbarRef.value?.closeLinkInput();
  clearMentionState();
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
    <EditorToolbar
      v-if="editable && isFocused"
      ref="toolbarRef"
      :active-formats="activeFormats"
      @format-text="formatText"
      @toggle-heading="toggleHeading"
      @toggle-quote="toggleQuote"
      @toggle-list="toggleList"
      @apply-link="handleApplyLink"
    />

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

    <MentionDropdown
      :suggestions="mentionSuggestions"
      :selected-index="mentionSelectedIndex"
      :coords="mentionCoords"
      @select="selectMention"
      @hover-index="mentionSelectedIndex = $event"
    />

    <MentionProfileTooltip :tooltip="activeMentionTooltip" />
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
