<script setup lang="ts">
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
import { type Component, nextTick, ref } from 'vue';
import type { ActiveFormats } from './lexicalConfig';

const props = defineProps<{
  activeFormats: ActiveFormats;
}>();

const emit = defineEmits<{
  formatText: [format: 'bold' | 'italic' | 'strikethrough' | 'code'];
  toggleHeading: [tag: 'h1' | 'h2'];
  toggleQuote: [];
  toggleList: [type: 'bullet' | 'number' | 'check'];
  applyLink: [url: string | null];
}>();

const showLinkInput = ref(false);
const linkUrl = ref('');
const linkInputRef = ref<HTMLInputElement | null>(null);

interface InlineButton {
  format: 'bold' | 'italic' | 'strikethrough' | 'code';
  title: string;
  icon: Component;
}

const inlineButtons: InlineButton[] = [
  { format: 'bold', title: 'Bold (**text**)', icon: Bold },
  { format: 'italic', title: 'Italic (*text*)', icon: Italic },
  { format: 'strikethrough', title: 'Strikethrough (~~text~~)', icon: Strikethrough },
  { format: 'code', title: 'Inline code (`code`)', icon: Code },
];

const listButtons: Array<{ type: 'bullet' | 'number' | 'check'; title: string; icon: Component }> =
  [
    { type: 'bullet', title: 'Bullet list (- )', icon: List },
    { type: 'number', title: 'Numbered list (1. )', icon: ListOrdered },
    { type: 'check', title: 'Checklist (- [ ] )', icon: CheckSquare },
  ];

function openLinkEditor() {
  if (props.activeFormats.link) {
    emit('applyLink', null);
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

function submitLink() {
  const trimmed = linkUrl.value.trim();
  if (trimmed && trimmed !== 'https://') {
    emit('applyLink', trimmed);
  }
  showLinkInput.value = false;
}

function closeLinkInput() {
  showLinkInput.value = false;
}

defineExpose({ closeLinkInput });
</script>

<template>
  <!-- Compact Markdown Toolbar -->
  <div
    class="flex items-center justify-between gap-1 px-2 py-1 border-b border-gray-200/80 bg-gray-50/90 rounded-t-lg flex-wrap"
  >
    <div class="flex items-center gap-0.5 flex-wrap">
      <button
        v-for="btn in inlineButtons"
        :key="btn.format"
        type="button"
        :title="btn.title"
        @mousedown.prevent="emit('formatText', btn.format)"
        :class="[
          'p-1 rounded text-gray-600 hover:bg-gray-200/70 transition-colors',
          activeFormats[btn.format] ? 'bg-indigo-100 text-modern-primary' : '',
        ]"
      >
        <component :is="btn.icon" class="w-3.5 h-3.5" />
      </button>

      <span class="w-px h-3.5 bg-gray-200 mx-1" />

      <button
        type="button"
        title="Heading 1 (# )"
        @mousedown.prevent="emit('toggleHeading', 'h1')"
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
        @mousedown.prevent="emit('toggleHeading', 'h2')"
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
        @mousedown.prevent="emit('toggleQuote')"
        :class="[
          'p-1 rounded text-gray-600 hover:bg-gray-200/70 transition-colors',
          activeFormats.blockType === 'quote' ? 'bg-indigo-100 text-modern-primary' : '',
        ]"
      >
        <Quote class="w-3.5 h-3.5" />
      </button>

      <span class="w-px h-3.5 bg-gray-200 mx-1" />

      <button
        v-for="btn in listButtons"
        :key="btn.type"
        type="button"
        :title="btn.title"
        @mousedown.prevent="emit('toggleList', btn.type)"
        :class="[
          'p-1 rounded text-gray-600 hover:bg-gray-200/70 transition-colors',
          activeFormats.blockType === btn.type ? 'bg-indigo-100 text-modern-primary' : '',
        ]"
      >
        <component :is="btn.icon" class="w-3.5 h-3.5" />
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
    v-if="showLinkInput"
    class="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50/70 border-b border-indigo-100"
  >
    <input
      ref="linkInputRef"
      v-model="linkUrl"
      type="url"
      placeholder="https://example.com"
      class="flex-1 px-2 py-1 text-xs bg-white border border-gray-300 rounded focus:outline-none focus:border-modern-primary"
      @keydown.enter.prevent="submitLink"
      @keydown.escape.prevent="showLinkInput = false"
    >
    <button
      type="button"
      class="px-2 py-1 text-[11px] font-medium bg-modern-primary text-white rounded hover:bg-modern-hover"
      @mousedown.prevent="submitLink"
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
</template>
