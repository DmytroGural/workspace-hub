import { onBeforeUnmount, onMounted, type Ref } from 'vue';

interface DismissibleLayerOptions {
  containerRef?: Ref<HTMLElement | null>;
  isActive: () => boolean;
  onDismiss: () => void;
  dismissOnOutsideClick?: boolean;
  dismissOnEscape?: boolean;
}

/**
 * Dismisses a drawer, popover, or modal on Escape key press and/or outside pointerdown.
 */
export function useDismissibleLayer(options: DismissibleLayerOptions) {
  const dismissOnOutsideClick = options.dismissOnOutsideClick ?? true;
  const dismissOnEscape = options.dismissOnEscape ?? true;

  function handlePointerDown(event: PointerEvent) {
    if (!dismissOnOutsideClick || !options.isActive()) return;
    const container = options.containerRef?.value;
    if (!container) return;
    if (event.target instanceof Node && !container.contains(event.target)) {
      options.onDismiss();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!dismissOnEscape || event.key !== 'Escape' || !options.isActive()) return;
    options.onDismiss();
  }

  onMounted(() => {
    if (dismissOnOutsideClick) {
      document.addEventListener('pointerdown', handlePointerDown);
    }
    if (dismissOnEscape) {
      window.addEventListener('keydown', handleKeydown);
    }
  });

  onBeforeUnmount(() => {
    if (dismissOnOutsideClick) {
      document.removeEventListener('pointerdown', handlePointerDown);
    }
    if (dismissOnEscape) {
      window.removeEventListener('keydown', handleKeydown);
    }
  });
}
