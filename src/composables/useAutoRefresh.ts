import { onBeforeUnmount, onMounted } from 'vue';

interface AutoRefreshOptions {
  getIntervalMs: () => number;
  shouldSkip: () => boolean;
  onTick: () => Promise<void>;
}

/**
 * Visibility-aware periodic polling composable.
 * Automatically pauses while the browser tab is hidden and triggers a refresh on return.
 */
export function useAutoRefresh(options: AutoRefreshOptions) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let active = false;
  let generation = 0;

  function clearTimer() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function stop() {
    active = false;
    generation += 1;
    clearTimer();
  }

  function schedule(gen = generation) {
    if (!active || gen !== generation) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

    clearTimer();
    timer = setTimeout(() => {
      void runTick(gen);
    }, options.getIntervalMs());
  }

  async function runTick(gen: number) {
    timer = null;
    if (!active || gen !== generation) return;

    try {
      if (!options.shouldSkip()) {
        await options.onTick();
      }
    } finally {
      schedule(gen);
    }
  }

  function restart() {
    stop();
    active = true;
    schedule(generation);
  }

  function handleVisibilityChange() {
    if (!active) return;
    if (document.visibilityState === 'hidden') {
      clearTimer();
    } else {
      void runTick(generation);
    }
  }

  onMounted(() => {
    restart();
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
  });

  onBeforeUnmount(() => {
    stop();
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  });

  return {
    restart,
    stop,
  };
}
