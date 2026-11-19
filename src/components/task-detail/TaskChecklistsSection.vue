<script setup lang="ts">
import { Check, CheckSquare } from 'lucide-vue-next';
import type { TaskChecklist } from '@/types/domain';

const props = withDefaults(
  defineProps<{
    checklists: TaskChecklist[];
    canToggle?: boolean;
  }>(),
  {
    canToggle: true,
  },
);

const emit = defineEmits<{
  toggleItem: [checklistId: string, itemId: string];
}>();

function handleItemClick(checklistId: string, itemId: string) {
  if (!props.canToggle) return;
  emit('toggleItem', checklistId, itemId);
}
</script>

<template>
  <div v-if="checklists.length > 0" class="space-y-4">
    <div
      v-for="chk in checklists"
      :key="chk.id"
      class="space-y-2.5 bg-gray-50 p-3.5 rounded-xl border border-gray-200/80"
    >
      <div class="flex items-center justify-between text-xs font-bold text-gray-800">
        <div class="flex items-center gap-1.5">
          <CheckSquare class="w-4 h-4 text-indigo-600" />
          <span>{{ chk.name }}</span>
        </div>
        <span class="text-[11px] text-gray-500 font-normal">
          {{ chk.checkItems.filter((i) => i.state === 'complete').length }}/{{
            chk.checkItems.length
          }}
        </span>
      </div>

      <!-- Items -->
      <div class="space-y-1.5 pt-1">
        <button
          type="button"
          v-for="item in chk.checkItems"
          :key="item.id"
          :disabled="!canToggle"
          @click="handleItemClick(chk.id, item.id)"
          :class="[
            'w-full text-left flex items-center gap-2.5 p-1.5 rounded-md transition-colors text-xs',
            canToggle ? 'hover:bg-white cursor-pointer' : 'opacity-80 cursor-default',
          ]"
        >
          <div
            :class="[
              'w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0',
              item.state === 'complete'
                ? 'bg-emerald-500 border-emerald-500 text-white'
                : 'border-gray-300 bg-white',
            ]"
          >
            <Check v-if="item.state === 'complete'" class="w-3 h-3 stroke-[3]" />
          </div>
          <span
            :class="[item.state === 'complete' ? 'line-through text-gray-400' : 'text-gray-800']"
          >
            {{ item.name }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
