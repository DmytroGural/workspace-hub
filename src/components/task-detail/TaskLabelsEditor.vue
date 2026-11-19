<script setup lang="ts">
import { Check, Plus, Save, Tag, X } from 'lucide-vue-next';
import { ref, watch } from 'vue';
import type { TaskLabel } from '@/types/domain';
import {
  DEFAULT_LABEL_COLORS,
  getLabelDisplayName,
  getLabelDotClass,
  getLabelDotStyle,
  getLabelPillClass,
  getLabelPillStyle,
} from '@/utils/labelColors';

const props = withDefaults(
  defineProps<{
    taskId?: string;
    attachedLabels: TaskLabel[];
    boardLabels: TaskLabel[];
    labelColors?: readonly string[];
    canCreateLabels?: boolean;
    isSaving?: boolean;
    layout?: 'grid' | 'stacked';
    showLabel?: boolean;
  }>(),
  {
    taskId: '',
    labelColors: () => DEFAULT_LABEL_COLORS,
    canCreateLabels: true,
    isSaving: false,
    layout: 'grid',
    showLabel: true,
  },
);

const emit = defineEmits<{
  toggleLabel: [label: TaskLabel];
  createLabel: [payload: { name: string; color: string }];
}>();

const isPickerOpen = ref(false);
const isCreating = ref(false);
const newLabelName = ref('');
const newLabelColor = ref<string>(props.labelColors[0] || DEFAULT_LABEL_COLORS[0]);

watch(
  () => props.taskId,
  () => {
    isPickerOpen.value = false;
    isCreating.value = false;
    newLabelName.value = '';
    newLabelColor.value = props.labelColors[0] || DEFAULT_LABEL_COLORS[0];
  },
);

function toggleLabel(lbl: TaskLabel) {
  emit('toggleLabel', lbl);
}

function isAttached(labelId: string): boolean {
  return props.attachedLabels.some((l) => l.id === labelId);
}

function submitCreateLabel() {
  const name = newLabelName.value.trim();
  if (!name || props.isSaving) return;
  emit('createLabel', { name, color: newLabelColor.value });
  newLabelName.value = '';
  isCreating.value = false;
}
</script>

<template>
  <div :class="layout === 'stacked' ? 'space-y-1.5' : 'grid grid-cols-3 items-start py-1'">
    <div
      v-if="showLabel"
      :class="
        layout === 'stacked'
          ? 'font-semibold text-gray-700 mb-1 flex items-center gap-1.5 text-xs'
          : 'text-gray-400 font-medium pt-1'
      "
    >
      <Tag v-if="layout === 'stacked'" class="w-3.5 h-3.5 text-gray-400" />
      <span>Labels{{ layout === 'stacked' ? ` (${attachedLabels.length} selected)` : '' }}</span>
    </div>
    <div :class="layout === 'stacked' ? 'space-y-2' : 'col-span-2 space-y-2'">
      <div class="flex flex-wrap items-center gap-1.5">
        <span
          v-for="lbl in attachedLabels"
          :key="lbl.id"
          :class="[
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border',
            getLabelPillClass(lbl.color),
          ]"
          :style="getLabelPillStyle(lbl.color)"
        >
          <span
            :class="['w-1.5 h-1.5 rounded-full shrink-0', getLabelDotClass(lbl.color)]"
            :style="getLabelDotStyle(lbl.color)"
          />
          <span>{{ getLabelDisplayName(lbl) }}</span>
          <button
            type="button"
            @click="emit('toggleLabel', lbl)"
            :disabled="isSaving"
            class="ml-0.5 hover:opacity-75 disabled:opacity-40"
            title="Remove label"
          >
            <X class="w-3 h-3" />
          </button>
        </span>

        <button
          type="button"
          @click="isPickerOpen = !isPickerOpen"
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border border-dashed border-gray-300 text-gray-600 hover:border-modern-primary hover:text-modern-primary transition-colors"
        >
          <Plus v-if="!isPickerOpen" class="w-3 h-3" />
          <Save v-else class="w-3 h-3" />
          <span>{{ isPickerOpen ? 'Done' : 'Labels' }}</span>
        </button>
      </div>

      <!-- Interactive Multi-Label Picker Popover -->
      <div
        v-if="isPickerOpen"
        class="p-2.5 rounded-lg border border-gray-200 bg-gray-50/80 space-y-2"
      >
        <div class="text-[11px] font-semibold text-gray-600 flex items-center gap-1.5">
          <Tag class="w-3 h-3 text-gray-400" />
          <span>Board Labels (select multiple)</span>
        </div>

        <div v-if="boardLabels.length > 0" class="flex flex-wrap gap-1.5">
          <button
            v-for="lbl in boardLabels"
            :key="lbl.id"
            type="button"
            @click="toggleLabel(lbl)"
            :disabled="isSaving"
            :class="[
              'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold border transition-all disabled:opacity-50',
              getLabelPillClass(lbl.color),
              isAttached(lbl.id)
                ? 'ring-2 ring-indigo-500 ring-offset-1'
                : 'opacity-75 hover:opacity-100',
            ]"
            :style="getLabelPillStyle(lbl.color)"
          >
            <span
              :class="['w-2 h-2 rounded-full shrink-0', getLabelDotClass(lbl.color)]"
              :style="getLabelDotStyle(lbl.color)"
            />
            <span>{{ getLabelDisplayName(lbl) }}</span>
            <Check v-if="isAttached(lbl.id)" class="w-3 h-3 shrink-0" />
          </button>
        </div>
        <div v-else class="text-[11px] text-gray-400 italic">No labels on this board yet.</div>

        <!-- Inline New Label Creator -->
        <template v-if="canCreateLabels">
          <div v-if="isCreating" class="pt-2 border-t border-gray-200 space-y-2">
            <input
              v-model="newLabelName"
              type="text"
              placeholder="Label name..."
              class="w-full px-2.5 py-1 text-xs bg-white border border-gray-300 rounded focus:outline-none focus:border-modern-primary"
              @keyup.enter="submitCreateLabel"
            >
            <div class="flex flex-wrap items-center gap-1.5">
              <button
                v-for="col in labelColors"
                :key="col"
                type="button"
                @click="newLabelColor = col"
                :title="col"
                :class="[
                  'w-5 h-5 rounded-full border border-black/10 transition-transform',
                  getLabelDotClass(col),
                  newLabelColor === col
                    ? 'ring-2 ring-offset-1 ring-gray-800 scale-110'
                    : 'opacity-80 hover:opacity-100',
                ]"
                :style="getLabelDotStyle(col)"
              />
            </div>
            <div class="flex items-center justify-end gap-1.5">
              <button
                type="button"
                @click="isCreating = false"
                class="px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-200 rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                @click="submitCreateLabel"
                :disabled="!newLabelName.trim() || isSaving"
                class="px-2.5 py-1 text-[11px] font-semibold text-white bg-modern-primary hover:bg-modern-hover rounded disabled:opacity-50"
              >
                Create & Attach
              </button>
            </div>
          </div>
          <button
            v-else
            type="button"
            @click="isCreating = true"
            class="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 pt-1"
          >
            <Plus class="w-3 h-3" />
            <span>Create new board label</span>
          </button>
        </template>
      </div>
    </div>
  </div>
</template>
