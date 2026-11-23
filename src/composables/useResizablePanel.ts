import { onBeforeUnmount, onMounted, ref } from 'vue';

interface ResizablePanelOptions {
  defaultWidth: number;
  minWidth: number;
  loadWidth: (fallback: number) => number;
  saveWidth: (width: number) => void;
  viewportMargin?: number;
}

/**
 * Manages horizontal drag-resizing, keyboard stepping, and viewport clamping for a side panel.
 */
export function useResizablePanel(options: ResizablePanelOptions) {
  const viewportMargin = options.viewportMargin ?? 80;
  const width = ref(options.loadWidth(options.defaultWidth));
  const isResizing = ref(false);
  let startX = 0;
  let startWidth = 0;

  function getMaxWidth(): number {
    if (typeof window === 'undefined') return 2000;
    return Math.max(options.minWidth, window.innerWidth - viewportMargin);
  }

  function clampWidth(candidate: number): number {
    return Math.min(getMaxWidth(), Math.max(options.minWidth, candidate));
  }

  function handleWindowResize() {
    const clamped = clampWidth(width.value);
    if (clamped !== width.value) {
      width.value = clamped;
      options.saveWidth(clamped);
    }
  }

  function onMouseMove(event: MouseEvent) {
    if (!isResizing.value) return;
    const delta = startX - event.clientX;
    width.value = clampWidth(startWidth + delta);
  }

  function stopResize() {
    if (!isResizing.value) return;
    isResizing.value = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', stopResize);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    options.saveWidth(width.value);
  }

  function startResize(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    isResizing.value = true;
    startX = event.clientX;
    startWidth = width.value;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', stopResize);
  }

  function resetWidth() {
    const clamped = clampWidth(options.defaultWidth);
    width.value = clamped;
    options.saveWidth(clamped);
  }

  function stepWidth(delta: number) {
    const clamped = clampWidth(width.value + delta);
    width.value = clamped;
    options.saveWidth(clamped);
  }

  onMounted(() => {
    window.addEventListener('resize', handleWindowResize);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('resize', handleWindowResize);
    stopResize();
  });

  return {
    width,
    isResizing,
    minWidth: options.minWidth,
    startResize,
    resetWidth,
    stepWidth,
  };
}
