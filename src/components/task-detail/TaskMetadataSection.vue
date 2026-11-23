<script setup lang="ts">
import { ArrowUpRight } from 'lucide-vue-next';
import { ref, watch } from 'vue';
import type { ProviderCapabilities } from '@/types/api';
import type { BoardList, TaskInterface, TaskLabel, WorkspaceMember } from '@/types/domain';
import { dateInputToIso, isoToDateInput } from '@/utils/dateUtils';
import TaskAssigneeEditor from './TaskAssigneeEditor.vue';
import TaskLabelsEditor from './TaskLabelsEditor.vue';

const props = defineProps<{
  task: TaskInterface;
  boardUrl?: string;
  availableLists: BoardList[];
  boardLabels: TaskLabel[];
  boardMembers: WorkspaceMember[];
  labelColors: readonly string[];
  capabilities: ProviderCapabilities;
  isSavingLabel: boolean;
  isSavingAssignee: boolean;
}>();

const emit = defineEmits<{
  updateDue: [dueIso: string | null];
  updateList: [listId: string];
  toggleAssignee: [member: WorkspaceMember];
  toggleLabel: [label: TaskLabel];
  createLabel: [payload: { name: string; color: string }];
}>();

const localDue = ref('');
const localListId = ref('');
const dueInputRef = ref<HTMLInputElement | null>(null);

watch(
  () => [props.task.id, props.task.due, props.task.idList] as const,
  ([id, due, idList], prev) => {
    const isNewTask = !prev || prev[0] !== id;
    if (isNewTask || document.activeElement !== dueInputRef.value) {
      localDue.value = isoToDateInput(due ?? null);
    }
    localListId.value = idList || '';
  },
  { immediate: true },
);

function handleDueChange() {
  emit('updateDue', dateInputToIso(localDue.value));
}

function handleListChange() {
  if (localListId.value !== props.task.idList) {
    emit('updateList', localListId.value);
  }
}
</script>

<template>
  <div class="space-y-3 text-xs !mt-0">
    <!-- Assignee -->
    <TaskAssigneeEditor
      v-if="capabilities.canAssignMembers"
      :task-id="task.id"
      :assigned-members="task.assignedMembers"
      :board-members="boardMembers"
      :is-saving="isSavingAssignee"
      @toggle-assignee="(member) => emit('toggleAssignee', member)"
    />

    <!-- Due Date -->
    <div class="grid grid-cols-3 items-center py-1">
      <span class="text-gray-400 font-medium">Due Date</span>
      <div class="col-span-2">
        <input
          ref="dueInputRef"
          v-model="localDue"
          type="date"
          :disabled="!capabilities.canEditTask"
          @change="handleDueChange"
          class="bg-gray-50 border border-gray-200 rounded px-2.5 py-1 text-xs text-gray-800 focus:outline-none focus:border-modern-primary focus:bg-white disabled:opacity-60 disabled:cursor-not-allowed"
        >
      </div>
    </div>

    <!-- Workspace Account -->
    <div class="grid grid-cols-3 items-center py-1">
      <span class="text-gray-400 font-medium">Account</span>
      <div class="col-span-2 flex items-center gap-2">
        <span
          class="w-2 h-2 rounded-full shrink-0"
          :style="{ backgroundColor: task.accountColor }"
        />
        <span class="font-medium text-gray-800 truncate">{{ task.accountLabel }}</span>
      </div>
    </div>

    <!-- Board / Project -->
    <div class="grid grid-cols-3 items-center py-1">
      <span class="text-gray-400 font-medium">Project / Board</span>
      <div class="col-span-2 min-w-0">
        <a
          v-if="boardUrl"
          :href="boardUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 max-w-full px-1.5 py-1 -mx-1.5 rounded-md hover:bg-indigo-50/70 group transition-colors"
          :title="`Open ${task.boardName}`"
        >
          <span
            class="w-2.5 h-2.5 rounded-sm shrink-0"
            :style="{ backgroundColor: task.boardColor }"
          />
          <span
            class="font-semibold text-gray-800 group-hover:text-modern-primary truncate transition-colors"
          >
            {{ task.boardName }}
          </span>
          <ArrowUpRight
            class="w-3.5 h-3.5 text-gray-400 group-hover:text-modern-primary shrink-0 transition-colors"
          />
        </a>
        <div v-else class="inline-flex items-center gap-2 max-w-full px-1.5 py-1 -mx-1.5">
          <span
            class="w-2.5 h-2.5 rounded-sm shrink-0"
            :style="{ backgroundColor: task.boardColor }"
          />
          <span class="font-semibold text-gray-800 truncate">
            {{ task.boardName }}
          </span>
        </div>
      </div>
    </div>

    <!-- List / Stage (Move list) -->
    <div class="grid grid-cols-3 items-center py-1">
      <span class="text-gray-400 font-medium">Board List</span>
      <div class="col-span-2">
        <select
          v-model="localListId"
          :disabled="!capabilities.canMoveBetweenLists"
          @change="handleListChange"
          class="bg-gray-50 border border-gray-200 rounded px-2.5 py-1 text-xs text-gray-800 focus:outline-none focus:border-modern-primary focus:bg-white w-full max-w-[200px] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <option v-for="l in availableLists" :key="l.id" :value="l.id">
            {{ l.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- Labels (multi-label management) -->
    <TaskLabelsEditor
      v-if="capabilities.canManageLabels"
      :task-id="task.id"
      :attached-labels="task.labels"
      :board-labels="boardLabels"
      :label-colors="labelColors"
      :can-create-labels="capabilities.canCreateLabels"
      :is-saving="isSavingLabel"
      @toggle-label="(lbl) => emit('toggleLabel', lbl)"
      @create-label="(payload) => emit('createLabel', payload)"
    />
  </div>
</template>
