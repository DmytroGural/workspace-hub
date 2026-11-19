<script setup lang="ts">
import { ExternalLink, FileText, Image as ImageIcon, X } from 'lucide-vue-next';
import { reactive } from 'vue';
import type { TaskAttachment } from '@/types/domain';
import { formatBytes } from '@/utils/taskPresentation';

withDefaults(
  defineProps<{
    attachments: TaskAttachment[];
    canDelete?: boolean;
    compact?: boolean;
  }>(),
  {
    canDelete: false,
    compact: false,
  },
);

const emit = defineEmits<{
  remove: [attachmentId: string];
}>();

const failedPreviews = reactive<Record<string, boolean>>({});

function getPreviewSrc(att: TaskAttachment): string | undefined {
  if (failedPreviews[att.id]) return undefined;
  if (att.previewUrl) return att.previewUrl;
  if (att.isImage && att.url) return att.url;
  return undefined;
}
</script>

<template>
  <div
    v-if="attachments.length > 0"
    :class="compact ? 'flex flex-wrap gap-1.5 pl-7' : 'grid grid-cols-1 gap-2'"
  >
    <a
      v-for="att in attachments"
      :key="att.id"
      :href="att.url"
      target="_blank"
      rel="noopener noreferrer"
      :class="[
        'group flex items-center gap-2.5 border rounded-lg transition-colors min-w-0',
        compact
          ? 'px-2 py-1.5 bg-white border-gray-200 hover:border-indigo-300 max-w-full'
          : 'p-2 bg-gray-50/80 border-gray-200 hover:border-indigo-300 hover:bg-white',
      ]"
      :title="att.name"
    >
      <!-- Preview Thumbnail or Icon -->
      <div
        :class="[
          'rounded border border-gray-200/80 bg-white flex items-center justify-center overflow-hidden shrink-0',
          compact ? 'w-7 h-7' : 'w-10 h-10',
        ]"
      >
        <img
          v-if="getPreviewSrc(att)"
          :src="getPreviewSrc(att)"
          :alt="att.name"
          @error="failedPreviews[att.id] = true"
          class="w-full h-full object-cover"
        >
        <ImageIcon v-else-if="att.isImage" class="w-4 h-4 text-indigo-500" />
        <FileText v-else class="w-4 h-4 text-gray-500" />
      </div>

      <!-- File Meta -->
      <div class="flex-1 min-w-0">
        <div class="text-[11px] font-medium text-gray-800 group-hover:text-modern-primary truncate">
          {{ att.name }}
        </div>
        <div v-if="att.bytes" class="text-[10px] text-gray-400">
          {{ formatBytes(att.bytes) }}
        </div>
      </div>

      <ExternalLink class="w-3 h-3 text-gray-400 group-hover:text-modern-primary shrink-0" />

      <button
        v-if="canDelete"
        type="button"
        @click.prevent.stop="emit('remove', att.id)"
        class="p-1 rounded text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
        title="Remove attachment"
      >
        <X class="w-3.5 h-3.5" />
      </button>
    </a>
  </div>
</template>
