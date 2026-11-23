import { onBeforeUnmount, type Ref, ref } from 'vue';
import type { TaskAttachment } from '@/types/domain';
import { nowIso } from '@/utils/dateUtils';

export interface PendingFileItem {
  id: string;
  file: File;
  previewUrl?: string;
  attachment: TaskAttachment;
}

/**
 * Manages file drag-and-drop, clipboard paste, file input triggering, and pending object URL cleanup.
 */
export function useFileDropzone(options: {
  fileInputRef: Ref<HTMLInputElement | null>;
  canAttach: () => boolean;
  onFiles: (files: File[]) => void;
}) {
  const isDragging = ref(false);

  function triggerFilePicker() {
    options.fileInputRef.value?.click();
  }

  function emitFiles(fileList: FileList | null | undefined) {
    if (!fileList || fileList.length === 0 || !options.canAttach()) return;
    options.onFiles(Array.from(fileList));
  }

  function handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    emitFiles(input.files);
    input.value = '';
  }

  function handleDragOver() {
    if (options.canAttach()) {
      isDragging.value = true;
    }
  }

  function handleDragLeave() {
    isDragging.value = false;
  }

  function handleDrop(event: DragEvent) {
    isDragging.value = false;
    emitFiles(event.dataTransfer?.files);
  }

  function handlePaste(event: ClipboardEvent) {
    const files = event.clipboardData?.files;
    if (files && files.length > 0 && options.canAttach()) {
      event.preventDefault();
      emitFiles(files);
    }
  }

  return {
    isDragging,
    triggerFilePicker,
    handleFileChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handlePaste,
  };
}

/**
 * Tracks locally queued File attachments with automatic ObjectURL creation and revocation.
 */
export function usePendingFiles() {
  const pendingFiles = ref<PendingFileItem[]>([]);

  function addFiles(files: File[]) {
    const next: PendingFileItem[] = files.map((file, idx) => {
      const id = `pending_${Date.now()}_${idx}_${file.name}`;
      const objectUrl = URL.createObjectURL(file);
      const isImage = file.type.startsWith('image/');
      return {
        id,
        file,
        previewUrl: isImage ? objectUrl : undefined,
        attachment: {
          id,
          name: file.name,
          url: objectUrl,
          mimeType: file.type || undefined,
          bytes: file.size,
          previewUrl: isImage ? objectUrl : undefined,
          createdAt: nowIso(),
          isImage,
        },
      };
    });
    pendingFiles.value = [...pendingFiles.value, ...next];
  }

  function removeFile(id: string) {
    const target = pendingFiles.value.find((item) => item.id === id);
    if (target) {
      URL.revokeObjectURL(target.attachment.url);
    }
    pendingFiles.value = pendingFiles.value.filter((item) => item.id !== id);
  }

  function clearFiles() {
    for (const item of pendingFiles.value) {
      URL.revokeObjectURL(item.attachment.url);
    }
    pendingFiles.value = [];
  }

  onBeforeUnmount(clearFiles);

  return {
    pendingFiles,
    addFiles,
    removeFile,
    clearFiles,
  };
}
