<script setup lang="ts">
import { CheckSquare } from 'lucide-vue-next';
import { computed } from 'vue';
import TaskAssigneeAvatars from '@/components/task-views/TaskAssigneeAvatars.vue';
import TaskCompleteButton from '@/components/task-views/TaskCompleteButton.vue';
import TaskDueBadge from '@/components/task-views/TaskDueBadge.vue';
import TaskLabelsList from '@/components/task-views/TaskLabelsList.vue';
import type { TaskInterface } from '@/types/domain';
import { getChecklistRatio } from '@/utils/taskPresentation';

const props = defineProps<{
  task: TaskInterface;
  isSelected: boolean;
  showAccountBadge: boolean;
}>();

const emit = defineEmits<{
  open: [taskId: string];
  toggleComplete: [task: TaskInterface];
}>();

const checklistRatio = computed(() => getChecklistRatio(props.task));
</script>

<template>
  <div
    role="button"
    tabindex="0"
    @click="emit('open', task.id)"
    @keydown.enter.prevent="emit('open', task.id)"
    @keydown.space.prevent="emit('open', task.id)"
    :class="[
      'grid grid-cols-12 px-6 py-2.5 items-center hover:bg-indigo-50/30 cursor-pointer text-xs border-b border-gray-50 transition-colors group',
      isSelected ? 'bg-indigo-50/50' : '',
    ]"
  >
    <!-- Task Name with Checkbox -->
    <div class="col-span-4 flex items-center gap-3 min-w-0 pr-3">
      <TaskCompleteButton :completed="task.dueComplete" @toggle="emit('toggleComplete', task)" />

      <span
        :class="[
          'truncate font-medium text-gray-900 group-hover:text-modern-primary transition-colors',
          task.dueComplete ? 'line-through text-gray-400' : '',
        ]"
      >
        {{ task.name }}
      </span>

      <span
        v-if="checklistRatio"
        class="inline-flex items-center gap-1 text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded shrink-0"
        title="Checklist items"
      >
        <CheckSquare class="w-3 h-3 text-gray-400" />
        <span>{{ checklistRatio.done }}/{{ checklistRatio.total }}</span>
      </span>
    </div>

    <!-- Board & List -->
    <div class="col-span-3 flex items-center gap-1.5 min-w-0 pr-2">
      <span class="w-2 h-2 rounded-sm shrink-0" :style="{ backgroundColor: task.boardColor }" />
      <span class="truncate font-medium text-gray-700">{{ task.boardName }}</span>
      <span class="text-gray-400 truncate">• {{ task.listName }}</span>
      <span
        v-if="showAccountBadge"
        class="text-[9px] px-1.5 py-0.2 rounded-full font-semibold shrink-0 border"
        :style="{
          color: task.accountColor,
          borderColor: `${task.accountColor}40`,
          backgroundColor: `${task.accountColor}12`,
        }"
        :title="`Account: ${task.accountLabel}`"
      >
        {{ task.accountLabel }}
      </span>
    </div>

    <!-- Due Date -->
    <div class="col-span-2 flex items-center gap-1.5 pr-2">
      <TaskDueBadge
        :due="task.due"
        :due-complete="task.dueComplete"
        :section="task.section"
        variant="pill"
        empty-text="-"
      />
    </div>

    <!-- Labels -->
    <div class="col-span-2 flex flex-wrap items-center gap-1 pr-2">
      <TaskLabelsList
        :labels="task.labels"
        :max-visible="2"
        max-width-class="max-w-[90px]"
        overflow-padding-class="px-1 py-0.5"
        show-empty-placeholder
      />
    </div>

    <!-- Assignee avatar -->
    <div class="col-span-1 flex justify-end">
      <TaskAssigneeAvatars
        :members="task.assignedMembers"
        ring-class="ring-2 ring-white"
        show-empty-placeholder
      />
    </div>
  </div>
</template>
