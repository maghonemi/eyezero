// cursorController.ts
// Controls cursor movement and visual feedback

export interface CursorPosition {
  x: number;
  y: number;
}

export class CursorController {
  private cursor: CursorPosition = { x: 0, y: 0 };
  private smoothing: number = 0.25;

  constructor(smoothing: number = 0.25) {
    this.smoothing = smoothing;
  }

  updatePosition(indexX: number, indexY: number, isPinching: boolean): CursorPosition {
    // Mirror X coordinate (camera is mirrored)
    let rawX = 1 - indexX;
    let rawY = indexY;

    // Smoothing - heavier smoothing when pinching for easier clicking
    const alpha = isPinching ? 0.1 : this.smoothing;
    this.cursor.x += (rawX - this.cursor.x) * alpha;
    this.cursor.y += (rawY - this.cursor.y) * alpha;

    // Map to screen pixels
    const screenX = this.cursor.x * window.screen.width;
    const screenY = this.cursor.y * window.screen.height;

    return { x: screenX, y: screenY };
  }

  setDragging(isDragging: boolean): void {
    // Handled by Electron main process
  }

  show(): void {
    if ((window as any).electronAPI) {
      (window as any).electronAPI.toggleCursorVisibility(true);
    }
  }

  hide(): void {
    if ((window as any).electronAPI) {
      (window as any).electronAPI.toggleCursorVisibility(false);
    }
  }

  getPosition(): CursorPosition {
    return { ...this.cursor };
  }
}

