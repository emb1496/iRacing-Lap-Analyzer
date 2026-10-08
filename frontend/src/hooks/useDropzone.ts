import { type DragEvent, useState } from "react";

/** Drag-and-drop handlers that hand the first dropped file to ``onFile``. */
export function useDropzone(onFile: (file: File) => void) {
  const [dragging, setDragging] = useState(false);
  const handlers = {
    onDragOver: (e: DragEvent) => {
      e.preventDefault();
      setDragging(true);
    },
    onDragLeave: () => setDragging(false),
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
  };
  return { dragging, handlers };
}
