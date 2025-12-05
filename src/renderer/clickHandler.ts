// clickHandler.ts
// Handles click, double-click, right-click, swipe, and scroll interactions

export type GestureType = 'none' | 'left-pinch' | 'right-pinch';

export class ClickHandler {
  private dragThreshold: number;
  private scrollSpeed: number;
  private state: 'idle' | 'pinching' | 'dragging' = 'idle';
  private currentGesture: GestureType = 'none';
  private pinchStart: { x: number; y: number } | null = null;
  private scrollAnchor: { x: number; y: number } | null = null;
  private lastHovered: Element | null = null;
  
  // Double-click detection (only for left click)
  private lastLeftClickTime: number = 0;
  private lastLeftClickPos: { x: number; y: number } | null = null;
  private doubleClickThreshold: number = 400; // ms between clicks for double-click
  private doubleClickDistance: number = 30; // max distance between clicks
  
  // Swipe detection (for presentation mode)
  private swipeEnabled: boolean = true;
  private swipeHistory: { x: number; y: number; time: number }[] = [];
  private swipeThreshold: number = 150; // pixels
  private swipeTimeWindow: number = 300; // ms
  private lastSwipeTime: number = 0;
  private swipeCooldown: number = 500; // ms between swipes

  constructor(dragThreshold: number = 40, scrollSpeed: number = 2.0) {
    this.dragThreshold = dragThreshold;
    this.scrollSpeed = scrollSpeed;
  }

  setSwipeEnabled(enabled: boolean): void {
    this.swipeEnabled = enabled;
  }

  handleInteraction(
    x: number,
    y: number,
    gesture: GestureType,
    onDragStateChange: (isDragging: boolean) => void,
    onSwipe?: (direction: 'left' | 'right') => void
  ): void {
    const isPinching = gesture !== 'none';
    const now = Date.now();
    
    // Track position for swipe detection (only when not pinching)
    if (!isPinching && this.swipeEnabled) {
      this.swipeHistory.push({ x, y, time: now });
      // Keep only recent history
      this.swipeHistory = this.swipeHistory.filter(p => now - p.time < this.swipeTimeWindow);
      
      // Detect swipe
      if (this.swipeHistory.length >= 5 && now - this.lastSwipeTime > this.swipeCooldown) {
        const oldest = this.swipeHistory[0];
        const newest = this.swipeHistory[this.swipeHistory.length - 1];
        const dx = newest.x - oldest.x;
        const dy = Math.abs(newest.y - oldest.y);
        const timeDiff = newest.time - oldest.time;
        
        // Horizontal swipe: significant X movement, minimal Y movement, fast enough
        if (Math.abs(dx) > this.swipeThreshold && dy < 80 && timeDiff < this.swipeTimeWindow) {
          const direction = dx > 0 ? 'right' : 'left';
          console.log(`[ClickHandler] Swipe detected: ${direction}`);
          this.lastSwipeTime = now;
          this.swipeHistory = []; // Clear history after swipe
          if (onSwipe) {
            onSwipe(direction);
          }
        }
      }
    } else {
      // Clear swipe history when pinching
      this.swipeHistory = [];
    }
    
    // Hover simulation
    const el = document.elementFromPoint(x, y);
    if (el !== this.lastHovered) {
      if (this.lastHovered) {
        this.dispatch(this.lastHovered, 'mouseleave');
      }
      if (el) {
        this.dispatch(el, 'mouseenter');
      }
      this.lastHovered = el;
    }
    if (el) {
      this.dispatch(el, 'mousemove', x, y);
    }

    // Gesture logic
    if (isPinching && this.state === 'idle') {
      // Starting a new pinch
      this.state = 'pinching';
      this.currentGesture = gesture;
      this.pinchStart = { x, y };
      this.scrollAnchor = { x, y };
      document.body.style.userSelect = 'none';
      
      if (el) {
        this.dispatch(el, 'mousedown', x, y);
      }
      
    } else if (isPinching && (this.state === 'pinching' || this.state === 'dragging')) {
      if (this.pinchStart) {
        const distMoved = Math.hypot(x - this.pinchStart.x, y - this.pinchStart.y);
        
        // Only allow dragging with left pinch
        if (this.state === 'pinching' && distMoved > this.dragThreshold && this.currentGesture === 'left-pinch') {
          this.state = 'dragging';
          onDragStateChange(true);
        }
        
        if (this.state === 'dragging' && this.scrollAnchor) {
          const deltaY = this.scrollAnchor.y - y;
          window.scrollBy({ top: deltaY * this.scrollSpeed, behavior: 'auto' });
          this.scrollAnchor = { x, y };
        }
      }
    } else if (!isPinching && this.state !== 'idle') {
      const prevState = this.state;
      const prevGesture = this.currentGesture;
      this.state = 'idle';
      this.currentGesture = 'none';
      document.body.style.userSelect = '';
      onDragStateChange(false);
      
      if (prevState === 'pinching' && this.pinchStart) {
        if (prevGesture === 'left-pinch') {
          // Left click logic with double-click detection
          const clickNow = Date.now();
          const timeSinceLastClick = clickNow - this.lastLeftClickTime;
          const distFromLastClick = this.lastLeftClickPos 
            ? Math.hypot(x - this.lastLeftClickPos.x, y - this.lastLeftClickPos.y)
            : Infinity;
          
          if (timeSinceLastClick < this.doubleClickThreshold && distFromLastClick < this.doubleClickDistance) {
            // Double click!
            console.log('[ClickHandler] Double pinch detected - performing double-click at', x, y);
            this.performSystemDoubleClick(x, y);
            this.lastLeftClickTime = 0;
            this.lastLeftClickPos = null;
          } else {
            // Single left click
            console.log('[ClickHandler] Left pinch released - performing click at', x, y);
            this.performSystemClick(x, y);
            this.lastLeftClickTime = clickNow;
            this.lastLeftClickPos = { x, y };
          }
        } else if (prevGesture === 'right-pinch') {
          // Right click - middle finger pinch
          console.log('[ClickHandler] Middle finger pinch released - performing right-click at', x, y);
          this.performSystemRightClick(x, y);
        }
      } else if (prevState === 'dragging' && el) {
        this.dispatch(el, 'mouseup', x, y);
      }
      
      this.pinchStart = null;
      this.scrollAnchor = null;
    }
  }

  private dispatch(element: Element, eventType: string, x?: number, y?: number): void {
    const event = new MouseEvent(eventType, {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      view: window
    });
    element.dispatchEvent(event);
  }

  private performSystemClick(x: number, y: number): void {
    console.log('[ClickHandler] Calling performClick with coordinates:', x, y);
    if ((window as any).electronAPI && (window as any).electronAPI.performClick) {
      (window as any).electronAPI.performClick(Math.round(x), Math.round(y));
    } else {
      console.error('[ClickHandler] electronAPI.performClick not available!');
    }
  }

  private performSystemDoubleClick(x: number, y: number): void {
    console.log('[ClickHandler] Calling performDoubleClick with coordinates:', x, y);
    if ((window as any).electronAPI && (window as any).electronAPI.performDoubleClick) {
      (window as any).electronAPI.performDoubleClick(Math.round(x), Math.round(y));
    } else {
      console.error('[ClickHandler] electronAPI.performDoubleClick not available!');
    }
  }

  private performSystemRightClick(x: number, y: number): void {
    console.log('[ClickHandler] Calling performRightClick with coordinates:', x, y);
    if ((window as any).electronAPI && (window as any).electronAPI.performRightClick) {
      (window as any).electronAPI.performRightClick(Math.round(x), Math.round(y));
    } else {
      console.error('[ClickHandler] electronAPI.performRightClick not available!');
    }
  }

  reset(): void {
    this.state = 'idle';
    this.currentGesture = 'none';
    this.pinchStart = null;
    this.scrollAnchor = null;
    this.lastHovered = null;
    this.lastLeftClickTime = 0;
    this.lastLeftClickPos = null;
    this.swipeHistory = [];
    document.body.style.userSelect = '';
  }
}
