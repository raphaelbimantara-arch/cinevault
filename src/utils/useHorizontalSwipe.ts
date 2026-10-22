import { useRef } from 'react';
import type { PointerEventHandler } from 'react';

interface HorizontalSwipeHandlers {
  onPointerDown: PointerEventHandler<HTMLElement>;
  onPointerUp: PointerEventHandler<HTMLElement>;
  onPointerCancel: PointerEventHandler<HTMLElement>;
}

export function useHorizontalSwipe(
  onSwipeLeft: () => void,
  onSwipeRight: () => void,
  enabled = true
): HorizontalSwipeHandlers {
  const startPoint = useRef<{ x: number; y: number } | null>(null);

  return {
    onPointerDown: (event) => {
      if (!enabled || event.button !== 0) return;
      startPoint.current = { x: event.clientX, y: event.clientY };
    },
    onPointerUp: (event) => {
      const start = startPoint.current;
      startPoint.current = null;
      if (!enabled || !start) return;

      const deltaX = event.clientX - start.x;
      const deltaY = event.clientY - start.y;
      if (Math.abs(deltaX) < 60 || Math.abs(deltaX) <= Math.abs(deltaY)) return;

      if (deltaX < 0) onSwipeLeft();
      else onSwipeRight();
    },
    onPointerCancel: () => {
      startPoint.current = null;
    },
  };
}
