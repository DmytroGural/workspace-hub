<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { onMounted } from 'vue';
import DashboardView from '@/components/DashboardView.vue';
import { useFiltersStore, useSyncStore } from '@/stores';

const filtersStore = useFiltersStore();
const syncStore = useSyncStore();
const { selectedBoardId, filterSection, viewMode } = storeToRefs(filtersStore);
const { refreshTasks } = syncStore;

onMounted(() => {
  selectedBoardId.value = null;
  filterSection.value = 'all';
  viewMode.value = 'dashboard';
  void refreshTasks({ minIntervalMs: 1500 });
});
</script>

<template>
  <DashboardView />
</template>
