import type { Modifier } from '@dnd-kit/core';

/**
 * Centers the drag overlay on the cursor position
 * This prevents the visual offset that occurs with the default behavior
 */
export const snapCenterToCursor: Modifier = ({ activatorEvent, draggingNodeRect, transform }) => {
  if (draggingNodeRect && activatorEvent) {
    const activatorCoordinates = {
      x: (activatorEvent as MouseEvent).clientX,
      y: (activatorEvent as MouseEvent).clientY,
    };

    // Calculate the center of the dragging element
    const offsetX = activatorCoordinates.x - draggingNodeRect.left - draggingNodeRect.width / 2;
    const offsetY = activatorCoordinates.y - draggingNodeRect.top - draggingNodeRect.height / 2;

    return {
      ...transform,
      x: transform.x + offsetX,
      y: transform.y + offsetY,
    };
  }

  return transform;
};
