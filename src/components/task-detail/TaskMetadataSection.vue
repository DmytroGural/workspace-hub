<script setup lang="ts">
import { ArrowUpRight, ChevronDown, ChevronUp, Plus } from 'lucide-vue-next';
import { computed, nextTick, ref, watch } from 'vue';
import type { ProviderCapabilities } from '@/types/api';
import type { BoardList, TaskInterface, TaskLabel, WorkspaceMember } from '@/types/domain';
import { dateInputToIso, isoToDateInput } from '@/utils/dateUtils';
import TaskAssigneeEditor from './TaskAssigneeEditor.vue';
import TaskLabelsEditor from './TaskLabelsEditor.vue';

type OptionalFieldKey = 'assignee' | 'due' | 'labels' | 'account' | 'board';

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
const showAllFields = ref(false);
const revealedFields = ref<Set<OptionalFieldKey>>(new Set());

watch(
  () => [props.task.id, props.task.due, props.task.idList] as const,
  ([id, due, idList], prev) => {
    const isNewTask = !prev || prev[0] !== id;
    if (isNewTask) {
      showAllFields.value = false;
      revealedFields.value = new Set();
    }
    if (isNewTask || document.activeElement !== dueInputRef.value) {
      localDue.value = isoToDateInput(due ?? null);
    }
    localListId.value = idList || '';
  },
  { immediate: true },
);

const hasAssignees = computed(() => props.task.assignedMembers.length > 0);
const hasDue = computed(() => Boolean(props.task.due || localDue.value));
const hasLabels = computed(() => props.task.labels.length > 0);

function isFieldVisible(field: OptionalFieldKey): boolean {
  if (showAllFields.value || revealedFields.value.has(field)) return true;
  if (field === 'assignee') return hasAssignees.value;
  if (field === 'due') return hasDue.value;
  if (field === 'labels') return hasLabels.value;
  // Secondary context fields (account, board) are collapsed by default
  return false;
}

const showAssignee = computed(
  () => props.capabilities.canAssignMembers && isFieldVisible('assignee'),
);
const showDue = computed(() => isFieldVisible('due'));
const showAccount = computed(() => isFieldVisible('account'));
const showBoard = computed(() => isFieldVisible('board'));
const showLabels = computed(() => props.capabilities.canManageLabels && isFieldVisible('labels'));

interface QuickAddOption {
  key: OptionalFieldKey;
  label: string;
}

const hiddenQuickFields = computed<QuickAddOption[]>(() => {
  const items: QuickAddOption[] = [];
  if (props.capabilities.canAssignMembers && !showAssignee.value) {
    items.push({ key: 'assignee', label: 'Assignee' });
  }
  if (props.capabilities.canEditTask && !showDue.value) {
    items.push({ key: 'due', label: 'Due Date' });
  }
  if (props.capabilities.canManageLabels && !showLabels.value) {
    items.push({ key: 'labels', label: 'Labels' });
  }
  return items;
});

const hiddenFieldCount = computed(() => {
  let count = 0;
  if (props.capabilities.canAssignMembers && !showAssignee.value) count++;
  if (!showDue.value) count++;
  if (!showAccount.value) count++;
  if (!showBoard.value) count++;
  if (props.capabilities.canManageLabels && !showLabels.value) count++;
  return count;
});

function revealField(field: OptionalFieldKey) {
  const next = new Set(revealedFields.value);
  next.add(field);
  revealedFields.value = next;

  if (field === 'due') {
    void nextTick().then(() => {
      dueInputRef.value?.focus();
    });
  }
}

function toggleShowAllFields() {
  if (hiddenFieldCount.value > 0) {
    showAllFields.value = true;
  } else {
    showAllFields.value = false;
    revealedFields.value = new Set();
  }
}

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
      v-if="showAssignee"
      :task-id="task.id"
      :assigned-members="task.assignedMembers"
      :board-members="boardMembers"
      :is-saving="isSavingAssignee"
      @toggle-assignee="(member) => emit('toggleAssignee', member)"
    />

    <!-- Due Date -->
    <div v-if="showDue" class="grid grid-cols-3 items-center py-1">
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
      v-if="showLabels"
      :task-id="task.id"
      :attached-labels="task.labels"
      :board-labels="boardLabels"
      :label-colors="labelColors"
      :can-create-labels="capabilities.canCreateLabels"
      :is-saving="isSavingLabel"
      @toggle-label="(lbl) => emit('toggleLabel', lbl)"
      @create-label="(payload) => emit('createLabel', payload)"
    />

    <!-- Workspace Account (secondary) -->
    <div v-if="showAccount" class="grid grid-cols-3 items-center py-1">
      <span class="text-gray-400 font-medium">Account</span>
      <div class="col-span-2 flex items-center gap-2">
        <span
          class="w-2 h-2 rounded-full shrink-0"
          :style="{ backgroundColor: task.accountColor }"
        />
        <span class="font-medium text-gray-800 truncate">{{ task.accountLabel }}</span>
      </div>
    </div>

    <!-- Board / Project (secondary) -->
    <div v-if="showBoard" class="grid grid-cols-3 items-center py-1">
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

    <!-- Compact controls to reveal hidden / empty fields -->
    <div class="flex items-center flex-wrap gap-1.5 pt-1">
      <button
        v-for="field in hiddenQuickFields"
        :key="field.key"
        type="button"
        @click="revealField(field.key)"
        class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-gray-500 hover:text-modern-primary hover:bg-indigo-50/70 border border-dashed border-gray-200 hover:border-indigo-200 transition-colors"
      >
        <Plus class="w-3 h-3" />
        <span>{{ field.label }}</span>
      </button>

      <button
        type="button"
        @click="toggleShowAllFields"
        class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors ml-auto"
      >
        <template v-if="hiddenFieldCount > 0">
          <span>Show all fields ({{ hiddenFieldCount }})</span>
          <ChevronDown class="w-3 h-3" />
        </template>
        <template v-else>
          <span>Hide extra fields</span>
          <ChevronUp class="w-3 h-3" />
        </template>
      </button>
    </div>
  </div>
</template>
