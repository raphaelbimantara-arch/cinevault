import { useRef } from 'react';
import type { MouseEvent, PointerEvent } from 'react';

const LONG_PRESS_DELAY = 500;
const MOVEMENT_TOLERANCE = 10;

export function useLongPress(
  onLongPress: (itemId: string) => void,
  enabled: boolean
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPosition = useRef<{ x: number; y: number } | null>(null);
  const didLongPress = useRef(false);

  const clearTimer = () => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    startPosition.current = null;
  };

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (!enabled || event.button !== 0) return;
    if (!(event.target instanceof Element)) return;
    const selectableElement = event.target.closest<HTMLElement>('[data-selection-id]');
    const itemId = selectableElement?.dataset.selectionId;
    if (!itemId) return;
    clearTimer();
    didLongPress.current = false;
    startPosition.current = { x: event.clientX, y: event.clientY };
    timer.current = setTimeout(() => {
      didLongPress.current = true;
      onLongPress(itemId);
    }, LONG_PRESS_DELAY);
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const start = startPosition.current;
    if (!start) return;
    if (
      Math.abs(event.clientX - start.x) > MOVEMENT_TOLERANCE ||
      Math.abs(event.clientY - start.y) > MOVEMENT_TOLERANCE
    ) {
      clearTimer();
    }
  };

  const onPointerUp = () => {
    clearTimer();
    if (didLongPress.current) {
      window.setTimeout(() => {
        didLongPress.current = false;
      }, 750);
    }
  };

  const onClickCapture = (event: MouseEvent<HTMLElement>) => {
    if (!didLongPress.current) return;
    didLongPress.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  const onContextMenu = (event: MouseEvent<HTMLElement>) => {
    if (!didLongPress.current) return;
    event.preventDefault();
  };

  const onPointerCancel = () => {
    clearTimer();
    if (didLongPress.current) {
      window.setTimeout(() => {
        didLongPress.current = false;
      }, 750);
    }
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onContextMenu,
    onClickCapture,
  };
}
