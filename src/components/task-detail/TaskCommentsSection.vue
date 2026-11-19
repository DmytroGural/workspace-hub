<script setup lang="ts">
import { AlertCircle, FileText, Loader2, MessageSquare, Paperclip, Send, X } from 'lucide-vue-next';
import { onBeforeUnmount, ref, watch } from 'vue';
import type { TaskComment } from '@/types/domain';
import { formatCommentDateTime } from '@/utils/dateUtils';
import { formatBytes, getMemberInitials } from '@/utils/taskPresentation';
import TaskAttachmentList from './TaskAttachmentList.vue';

interface PendingAttachment {
  id: string;
  file: File;
  previewUrl?: string;
}

const props = withDefaults(
  defineProps<{
    taskId: string;
    comments?: TaskComment[];
    canComment?: boolean;
    canManageAttachments?: boolean;
    isLoading: boolean;
    isPosting: boolean;
    error: string | null;
  }>(),
  {
    canComment: true,
    canManageAttachments: true,
  },
);

const emit = defineEmits<{
  addComment: [payload: { text: string; files: File[] }];
}>();

const newCommentText = ref('');
const pendingAttachments = ref<PendingAttachment[]>([]);
const fileInputRef = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);

function clearPendingAttachments() {
  pendingAttachments.value.forEach((item) => {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
  });
  pendingAttachments.value = [];
}

onBeforeUnmount(clearPendingAttachments);

watch(
  () => props.taskId,
  () => {
    newCommentText.value = '';
    clearPendingAttachments();
  },
);

watch(
  () => props.isPosting,
  (nowPosting, wasPosting) => {
    if (wasPosting && !nowPosting && !props.error) {
      newCommentText.value = '';
      clearPendingAttachments();
    }
  },
);

function addFiles(fileList: FileList | null | undefined) {
  if (!fileList || fileList.length === 0 || !props.canManageAttachments) return;
  const next = Array.from(fileList).map((file, idx) => ({
    id: `${Date.now()}_${idx}_${file.name}`,
    file,
    previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
  }));
  pendingAttachments.value = [...pendingAttachments.value, ...next];
}

function removePending(id: string) {
  const target = pendingAttachments.value.find((item) => item.id === id);
  if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
  pendingAttachments.value = pendingAttachments.value.filter((item) => item.id !== id);
}

function triggerFilePicker() {
  fileInputRef.value?.click();
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  addFiles(input.files);
  input.value = '';
}

function handleDrop(event: DragEvent) {
  isDragging.value = false;
  addFiles(event.dataTransfer?.files);
}

function handlePaste(event: ClipboardEvent) {
  const files = event.clipboardData?.files;
  if (files && files.length > 0 && props.canManageAttachments) {
    event.preventDefault();
    addFiles(files);
  }
}

function submitComment() {
  const text = newCommentText.value.trim();
  const files = pendingAttachments.value.map((p) => p.file);
  if ((!text && files.length === 0) || props.isPosting) return;
  emit('addComment', { text, files });
}
</script>

<template>
  <div class="space-y-3 pt-1">
    <div class="flex items-center justify-between">
      <div
        class="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wide"
      >
        <MessageSquare class="w-3.5 h-3.5 text-gray-500" />
        <span>Comments ({{ comments?.length || 0 }})</span>
      </div>
      <span v-if="isLoading" class="inline-flex items-center gap-1 text-[11px] text-gray-400">
        <Loader2 class="w-3 h-3 animate-spin" />
        Loading...
      </span>
    </div>

    <div
      v-if="error"
      class="flex items-start gap-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs"
    >
      <AlertCircle class="w-3.5 h-3.5 shrink-0 mt-0.5" />
      <span>{{ error }}</span>
    </div>

    <!-- Existing Comments Thread -->
    <div v-if="comments && comments.length > 0" class="space-y-2.5">
      <div
        v-for="comment in comments"
        :key="comment.id"
        class="bg-gray-50/90 border border-gray-200/80 rounded-xl p-3 space-y-2"
      >
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <img
              v-if="comment.author.avatarUrl"
              :src="comment.author.avatarUrl"
              :alt="comment.author.fullName"
              class="w-5 h-5 rounded-full object-cover ring-1 ring-gray-200 shrink-0"
            >
            <div
              v-else
              class="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold shrink-0"
            >
              {{ getMemberInitials(comment.author) }}
            </div>
            <span class="text-xs font-semibold text-gray-800 truncate">
              {{ comment.author.fullName }}
            </span>
          </div>
          <span class="text-[10px] text-gray-400 shrink-0">
            {{ formatCommentDateTime(comment.createdAt) }}
          </span>
        </div>

        <p
          v-if="comment.text"
          class="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap break-words pl-7"
        >
          {{ comment.text }}
        </p>

        <TaskAttachmentList
          v-if="comment.attachments && comment.attachments.length > 0"
          :attachments="comment.attachments"
          compact
        />
      </div>
    </div>

    <p v-else-if="!isLoading" class="text-xs text-gray-400 italic py-1">
      No comments yet. Write the first comment below.
    </p>

    <!-- New Comment Composer -->
    <form
      v-if="canComment"
      @submit.prevent="submitComment"
      @dragover.prevent="canManageAttachments && (isDragging = true)"
      @dragleave.self="isDragging = false"
      @drop.prevent="handleDrop"
      :class="[
        'space-y-2 pt-1 rounded-lg transition-all',
        isDragging ? 'ring-2 ring-indigo-400 bg-indigo-50/40 p-1.5 -m-1.5' : '',
      ]"
    >
      <textarea
        v-model="newCommentText"
        @keydown.ctrl.enter.prevent="submitComment"
        @keydown.meta.enter.prevent="submitComment"
        @paste="handlePaste"
        rows="2"
        placeholder="Write a comment or drop/paste files... (Ctrl+Enter to send)"
        class="w-full text-xs text-gray-800 bg-white border border-gray-200 focus:border-modern-primary focus:ring-1 focus:ring-modern-primary rounded-lg p-2.5 transition-colors outline-none resize-y"
      />

      <!-- Pending File Attachments -->
      <div v-if="pendingAttachments.length > 0" class="flex flex-wrap gap-1.5">
        <div
          v-for="item in pendingAttachments"
          :key="item.id"
          class="inline-flex items-center gap-1.5 pl-1.5 pr-1 py-1 rounded-md border border-indigo-200 bg-indigo-50/70 text-[11px] text-gray-800 max-w-full"
        >
          <img
            v-if="item.previewUrl"
            :src="item.previewUrl"
            :alt="item.file.name"
            class="w-4 h-4 rounded object-cover shrink-0"
          >
          <FileText v-else class="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span class="truncate max-w-[150px] font-medium">{{ item.file.name }}</span>
          <span class="text-[10px] text-gray-400 shrink-0">{{ formatBytes(item.file.size) }}</span>
          <button
            type="button"
            @click="removePending(item.id)"
            :disabled="isPosting"
            class="p-0.5 rounded text-gray-400 hover:text-rose-600 hover:bg-white disabled:opacity-40"
            title="Remove file"
          >
            <X class="w-3 h-3" />
          </button>
        </div>
      </div>

      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <template v-if="canManageAttachments">
            <input
              ref="fileInputRef"
              type="file"
              multiple
              class="hidden"
              @change="handleFileChange"
            >
            <button
              type="button"
              @click="triggerFilePicker"
              :disabled="isPosting"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-gray-600 hover:text-modern-primary hover:bg-gray-100 border border-gray-200 transition-colors disabled:opacity-50"
              title="Attach files to comment"
            >
              <Paperclip class="w-3 h-3" />
              <span>Attach</span>
            </button>
          </template>
          <span class="text-[10px] text-gray-400"> Ctrl+Enter to post </span>
        </div>

        <button
          type="submit"
          :disabled="isPosting || (!newCommentText.trim() && pendingAttachments.length === 0)"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-modern-primary hover:bg-modern-primary-hover disabled:opacity-50 transition-colors"
        >
          <Loader2 v-if="isPosting" class="w-3.5 h-3.5 animate-spin" />
          <Send v-else class="w-3.5 h-3.5" />
          <span>{{ isPosting ? 'Posting...' : 'Comment' }}</span>
        </button>
      </div>
    </form>
  </div>
</template>
