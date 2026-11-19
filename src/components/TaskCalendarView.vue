<script setup lang="ts">
import { DateTime } from 'luxon';
import { computed, ref } from 'vue';
import { useTaskView } from '@/composables/useTaskView';
import {
  buildCalendarDays,
  CALENDAR_WEEKDAYS,
  type CalendarDay,
} from './task-calendar/calendarGrid';
import TaskCalendarDayCell from './task-calendar/TaskCalendarDayCell.vue';
import TaskCalendarToolbar from './task-calendar/TaskCalendarToolbar.vue';

const { tasks, selectedTaskId, openTask, openCreateTask, toggleTaskComplete } = useTaskView();

const currentMonthDate = ref(DateTime.now().startOf('month'));

function prevMonth() {
  currentMonthDate.value = currentMonthDate.value.minus({ months: 1 });
}

function nextMonth() {
  currentMonthDate.value = currentMonthDate.value.plus({ months: 1 });
}

function today() {
  currentMonthDate.value = DateTime.now().startOf('month');
}

const monthLabel = computed(() =>
  currentMonthDate.value.toLocaleString({ month: 'long', year: 'numeric' }),
);

const calendarDays = computed<CalendarDay[]>(() =>
  buildCalendarDays(currentMonthDate.value, tasks.value),
);

const gridRowsClass = computed(() =>
  calendarDays.value.length > 35 ? 'grid-rows-6' : 'grid-rows-5',
);
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <TaskCalendarToolbar
      :month-label="monthLabel"
      @prev-month="prevMonth"
      @next-month="nextMonth"
      @today="today"
      @add-task="openCreateTask"
    />

    <!-- Day of Week Headers -->
    <div
      class="grid grid-cols-7 border-b border-gray-200 text-center py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider shrink-0"
    >
      <div v-for="weekday in CALENDAR_WEEKDAYS" :key="weekday">{{ weekday }}</div>
    </div>

    <!-- Calendar Month Grid -->
    <div
      :class="[
        'flex-1 grid grid-cols-7 border-b border-gray-200 overflow-hidden divide-x divide-gray-200',
        gridRowsClass,
      ]"
    >
      <TaskCalendarDayCell
        v-for="cell in calendarDays"
        :key="cell.dateString"
        :day="cell"
        :selected-task-id="selectedTaskId"
        @open-task="openTask"
        @toggle-complete="toggleTaskComplete"
      />
    </div>
  </div>
</template>
