<script setup lang="ts">
import { AlertCircle, Loader2, Paperclip } from 'lucide-vue-next';
import { computed, ref, watch } from 'vue';
import LexicalMarkdownEditor from '@/components/editor/LexicalMarkdownEditor.vue';
import { useFileDropzone } from '@/composables/useFileAttachments';
import type { TaskAttachment, WorkspaceMember } from '@/types/domain';
import TaskAttachmentList from './TaskAttachmentList.vue';

const props = withDefaults(
  defineProps<{
    taskId?: string;
    description: string;
    attachments?: TaskAttachment[];
    mentionMembers?: WorkspaceMember[];
    canEdit?: boolean;
    canManageAttachments?: boolean;
    isUploading?: boolean;
    error?: string | null;
    layout?: 'drawer' | 'stacked';
    placeholder?: string;
  }>(),
  {
    taskId: '',
    attachments: () => [],
    mentionMembers: () => [],
    canEdit: true,
    canManageAttachments: false,
    isUploading: false,
    error: null,
    layout: 'drawer',
    placeholder: '',
  },
);

const emit = defineEmits<{
  updateDescription: [value: string];
  blur: [];
  uploadFiles: [files: File[]];
  deleteAttachment: [attachmentId: string];
}>();

const fileInputRef = ref<HTMLInputElement | null>(null);
const localDesc = ref(props.description || '');
const editorId = computed(() => (props.taskId ? `task-desc-${props.taskId}` : 'new-task-desc'));

const {
  isDragging,
  triggerFilePicker,
  handleFileChange,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handlePaste,
} = useFileDropzone({
  fileInputRef,
  canAttach: () => props.canManageAttachments,
  onFiles: (files) => emit('uploadFiles', files),
});

watch(
  () => [props.taskId, props.description] as const,
  ([_id, desc]) => {
    localDesc.value = desc || '';
  },
  { immediate: true },
);

function handleEditorUpdate(value: string) {
  localDesc.value = value;
  emit('updateDescription', value);
}

function handleBlur() {
  emit('updateDescription', localDesc.value);
  emit('blur');
}
</script>

<template>
  <section
    :class="layout === 'stacked' ? 'space-y-1' : 'space-y-2.5'"
    aria-label="Task description and attachments dropzone"
    @dragover.prevent="handleDragOver"
    @dragleave.self="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <div class="flex items-center justify-between gap-2">
      <label
        :for="editorId"
        :class="
          layout === 'stacked'
            ? 'block font-semibold text-gray-700 mb-1'
            : 'text-xs font-bold text-gray-700 uppercase tracking-wide'
        "
      >
        Description
      </label>

      <div v-if="canManageAttachments" class="flex items-center gap-2">
        <input ref="fileInputRef" type="file" multiple class="hidden" @change="handleFileChange">
        <button
          type="button"
          @click="triggerFilePicker"
          :disabled="isUploading"
          class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-gray-600 hover:text-modern-primary hover:bg-gray-100 border border-gray-200 transition-colors disabled:opacity-50"
          title="Attach files to task description"
        >
          <Loader2 v-if="isUploading" class="w-3 h-3 animate-spin" />
          <Paperclip v-else class="w-3 h-3" />
          <span>{{ isUploading ? 'Uploading...' : 'Attach file' }}</span>
        </button>
      </div>
    </div>

    <div
      :class="[
        'rounded-lg transition-all',
        isDragging ? 'ring-2 ring-indigo-400 bg-indigo-50/40 p-1 -m-1' : '',
      ]"
    >
      <LexicalMarkdownEditor
        :id="editorId"
        :model-value="localDesc"
        :reset-key="taskId"
        :editable="canEdit"
        :mention-members="mentionMembers"
        :variant="layout"
        :placeholder="
          placeholder ||
          (layout === 'stacked'
            ? 'Add context, specifications, or links (Markdown)...'
            : 'Add details in Markdown, or drop/paste files here...')
        "
        @update:model-value="handleEditorUpdate"
        @blur="handleBlur"
        @paste="handlePaste"
      />
    </div>

    <div
      v-if="error"
      class="flex items-start gap-2 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs"
    >
      <AlertCircle class="w-3.5 h-3.5 shrink-0 mt-0.5" />
      <span>{{ error }}</span>
    </div>

    <TaskAttachmentList
      v-if="attachments && attachments.length > 0"
      :attachments="attachments"
      :can-delete="canManageAttachments"
      @remove="emit('deleteAttachment', $event)"
    />
  </section>
</template>
