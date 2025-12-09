// clickHandler.ts
// Handles click, double-click, right-click, swipe, and scroll interactions

export type GestureType = 'none' | 'left-pinch' | 'right-pinch' | 'ring-pinch' | 'pinky-pinch';

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
  private swipeHistory: { x: number; y: number; time: number; velocity?: number }[] = [];
  private swipeThreshold: number = 200; // pixels - increased
  private swipeTimeWindow: number = 400; // ms - longer window
  private lastSwipeTime: number = 0;
  private swipeCooldown: number = 1000; // ms - longer cooldown
  private minSwipeVelocity: number = 0.5; // px/ms
  private openHandStartTime: number = 0;
  private minOpenHandDuration: number = 300; // ms - must hold open hand before swipe
  private swipeStartPosition: { x: number; y: number } | null = null;
  private isTrackingSwipe: boolean = false;
  private deadZone: number = 30; // pixels - ignore movements smaller than this

  constructor(dragThreshold: number = 40, scrollSpeed: number = 2.0) {
    this.dragThreshold = dragThreshold;
    this.scrollSpeed = scrollSpeed;
  }

  setSwipeEnabled(enabled: boolean): void {
    this.swipeEnabled = enabled;
    if (!enabled) {
      this.swipeHistory = [];
      this.swipeStartPosition = null;
      this.isTrackingSwipe = false;
      this.openHandStartTime = 0;
    }
  }

  // Check if hand is in "open" state (all fingers extended)
  isHandOpen(landmarks: any[]): boolean {
    if (!landmarks || landmarks.length < 21) return false;
    
    const wrist = landmarks[0];
    const thumb = landmarks[4];
    const thumbBase = landmarks[2];
    const index = landmarks[8];
    const indexBase = landmarks[5];
    const middle = landmarks[12];
    const middleBase = landmarks[9];
    const ring = landmarks[16];
    const ringBase = landmarks[13];
    const pinky = landmarks[20];
    const pinkyBase = landmarks[17];
    
    // Check if fingers are extended (tip is farther from wrist than base)
    const thumbExtended = Math.hypot(thumb.x - wrist.x, thumb.y - wrist.y) > 
                          Math.hypot(thumbBase.x - wrist.x, thumbBase.y - wrist.y);
    const indexExtended = Math.hypot(index.x - wrist.x, index.y - wrist.y) > 
                          Math.hypot(indexBase.x - wrist.x, indexBase.y - wrist.y);
    const middleExtended = Math.hypot(middle.x - wrist.x, middle.y - wrist.y) > 
                           Math.hypot(middleBase.x - wrist.x, middleBase.y - wrist.y);
    const ringExtended = Math.hypot(ring.x - wrist.x, ring.y - wrist.y) > 
                         Math.hypot(ringBase.x - wrist.x, ringBase.y - wrist.y);
    const pinkyExtended = Math.hypot(pinky.x - wrist.x, pinky.y - wrist.y) > 
                          Math.hypot(pinkyBase.x - wrist.x, pinkyBase.y - wrist.y);
    
    // Check that fingers are not pinching
    const thumbIndexDist = Math.hypot(index.x - thumb.x, index.y - thumb.y);
    const thumbMiddleDist = Math.hypot(middle.x - thumb.x, middle.y - thumb.y);
    
    // All fingers extended and not pinching
    return thumbExtended && indexExtended && middleExtended && ringExtended && pinkyExtended &&
           thumbIndexDist > 0.08 && thumbMiddleDist > 0.08;
  }

  handleInteraction(
    x: number,
    y: number,
    gesture: GestureType,
    onDragStateChange: (isDragging: boolean) => void,
    onSwipe?: (direction: 'left' | 'right') => void,
    landmarks?: any[], // Add landmarks for open hand detection
    presentationMode?: boolean // Presentation mode flag
  ): void {
    const isPinching = gesture !== 'none';
    const now = Date.now();
    
    // Use wrist position if available (more stable), otherwise use provided position
    let trackingX = x;
    let trackingY = y;
    if (landmarks && landmarks.length >= 21) {
      // Use wrist position (landmark 0) for more stable tracking
      const screenWidth = window.innerWidth || 1920;
      const screenHeight = window.innerHeight || 1080;
      trackingX = landmarks[0].x * screenWidth;
      trackingY = landmarks[0].y * screenHeight;
    }
    
    // Check if hand is open
    const isOpenHand = landmarks ? this.isHandOpen(landmarks) : false;
    
    // Track open hand duration
    if (!isPinching && this.swipeEnabled && isOpenHand) {
      if (this.openHandStartTime === 0) {
        this.openHandStartTime = now;
      }
      
      // Only start tracking after holding open hand for minimum duration
      if (now - this.openHandStartTime >= this.minOpenHandDuration) {
        // Check if we should start tracking a new swipe
        if (!this.isTrackingSwipe) {
          // Check if hand has moved enough to start tracking (dead zone)
          if (this.swipeStartPosition) {
            const distFromStart = Math.hypot(
              trackingX - this.swipeStartPosition.x,
              trackingY - this.swipeStartPosition.y
            );
            if (distFromStart > this.deadZone) {
              this.isTrackingSwipe = true;
            }
          } else {
            // Initialize start position
            this.swipeStartPosition = { x: trackingX, y: trackingY };
          }
        }
        
        // Track swipe if we're actively tracking
        if (this.isTrackingSwipe) {
          // Calculate velocity
          let velocity = 0;
          if (this.swipeHistory.length > 0) {
            const last = this.swipeHistory[this.swipeHistory.length - 1];
            const dx = trackingX - last.x;
            const dt = now - last.time;
            velocity = dt > 0 ? Math.abs(dx) / dt : 0;
          }
          
          this.swipeHistory.push({ x: trackingX, y: trackingY, time: now, velocity });
          // Keep only recent history
          this.swipeHistory = this.swipeHistory.filter(p => now - p.time < this.swipeTimeWindow);
          
          // Detect swipe - require more points and better validation
          if (this.swipeHistory.length >= 8 && now - this.lastSwipeTime > this.swipeCooldown) {
            const oldest = this.swipeHistory[0];
            const newest = this.swipeHistory[this.swipeHistory.length - 1];
            const dx = newest.x - oldest.x;
            const dy = Math.abs(newest.y - oldest.y);
            const timeDiff = newest.time - oldest.time;
            const avgVelocity = Math.abs(dx) / timeDiff;
            
            // Check for wind-up: first movement should be opposite direction
            let hasWindUp = false;
            if (this.swipeHistory.length >= 4) {
              const firstHalf = this.swipeHistory.slice(0, Math.floor(this.swipeHistory.length / 2));
              const secondHalf = this.swipeHistory.slice(Math.floor(this.swipeHistory.length / 2));
              const firstDx = firstHalf[firstHalf.length - 1].x - firstHalf[0].x;
              const secondDx = secondHalf[secondHalf.length - 1].x - secondHalf[0].x;
              // Wind-up: first half moves opposite to second half
              if ((firstDx > 0 && secondDx < 0) || (firstDx < 0 && secondDx > 0)) {
                hasWindUp = true;
              }
            }
            
            // Check direction consistency (at least 80% in same direction)
            const direction = dx > 0 ? 'right' : 'left';
            let consistentMovement = 0;
            let totalMovement = 0;
            for (let i = 1; i < this.swipeHistory.length; i++) {
              const segmentDx = this.swipeHistory[i].x - this.swipeHistory[i-1].x;
              totalMovement += Math.abs(segmentDx);
              if ((direction === 'right' && segmentDx > 0) || (direction === 'left' && segmentDx < 0)) {
                consistentMovement += Math.abs(segmentDx);
              }
            }
            const consistencyRatio = totalMovement > 0 ? consistentMovement / totalMovement : 0;
            
            // Check for acceleration pattern (peak velocity in middle)
            const velocities = this.swipeHistory
              .filter(p => p.velocity !== undefined)
              .map(p => p.velocity!);
            const peakVelocity = velocities.length > 0 ? Math.max(...velocities) : 0;
            const peakIndex = velocities.indexOf(peakVelocity);
            const hasAccelerationPattern = peakIndex > 2 && peakIndex < velocities.length - 2;
            
            // Horizontal swipe: significant X movement, minimal Y movement, fast enough, consistent direction
            if (Math.abs(dx) > this.swipeThreshold && 
                dy < 50 && // Strict vertical constraint
                timeDiff < this.swipeTimeWindow && 
                avgVelocity > this.minSwipeVelocity &&
                consistencyRatio > 0.8 && // 80% consistent direction
                (hasWindUp || hasAccelerationPattern)) { // Either wind-up or acceleration pattern
              console.log(`[ClickHandler] Swipe detected: ${direction} (velocity: ${avgVelocity.toFixed(2)}, consistency: ${(consistencyRatio*100).toFixed(0)}%)`);
              this.lastSwipeTime = now;
              this.swipeHistory = [];
              this.swipeStartPosition = null;
              this.isTrackingSwipe = false;
              this.openHandStartTime = 0;
              if (onSwipe) {
                onSwipe(direction);
              }
            }
          }
        }
      }
    } else {
      // Reset when pinching or hand not open
      if (isPinching || !isOpenHand) {
        this.swipeHistory = [];
        this.swipeStartPosition = null;
        this.isTrackingSwipe = false;
        this.openHandStartTime = 0;
      }
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
    // In presentation mode, ring/pinky pinches are for slide navigation, not clicks
    const isSlideGesture = presentationMode && (gesture === 'ring-pinch' || gesture === 'pinky-pinch');
    const isClickGesture = gesture === 'left-pinch' || gesture === 'right-pinch';
    
    if ((isPinching && !isSlideGesture) && this.state === 'idle') {
      // Starting a new pinch (for clicks/dragging, not slide gestures)
      this.state = 'pinching';
      this.currentGesture = gesture;
      this.pinchStart = { x, y };
      this.scrollAnchor = { x, y };
      document.body.style.userSelect = 'none';
      
      if (el && !presentationMode) {
        this.dispatch(el, 'mousedown', x, y);
      }
      
    } else if ((isPinching && !isSlideGesture) && (this.state === 'pinching' || this.state === 'dragging')) {
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
          // Left click logic with double-click detection (only if not in presentation mode)
          if (!presentationMode) {
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
          }
        } else if (prevGesture === 'right-pinch' && !presentationMode) {
          // Right click - middle finger pinch (only if not in presentation mode)
          console.log('[ClickHandler] Middle finger pinch released - performing right-click at', x, y);
          this.performSystemRightClick(x, y);
        }
      } else if (prevState === 'dragging' && el) {
        this.dispatch(el, 'mouseup', x, y);
      }
      
      // Only clear pinchStart if it's not a slide gesture
      if (prevGesture !== 'ring-pinch' && prevGesture !== 'pinky-pinch') {
        this.pinchStart = null;
      }
      this.scrollAnchor = null;
    }
    
    // Handle slide navigation gestures (ring/pinky pinch in presentation mode)
    if (isSlideGesture && this.state === 'idle') {
      // Track when slide gesture starts
      if (!this.pinchStart) {
        this.pinchStart = { x, y };
        this.currentGesture = gesture;
        console.log(`[ClickHandler] Slide gesture started: ${gesture}`);
      }
    } else if (!isSlideGesture && this.pinchStart && (this.currentGesture === 'ring-pinch' || this.currentGesture === 'pinky-pinch')) {
      // Slide gesture released - send navigation key
      if (presentationMode && (window as any).electronAPI?.sendKey) {
        if (this.currentGesture === 'ring-pinch') {
          // Ring + thumb = next slide (right arrow)
          console.log('[ClickHandler] Ring pinch - next slide');
          (window as any).electronAPI.sendKey('right');
        } else if (this.currentGesture === 'pinky-pinch') {
          // Pinky + thumb = previous slide (left arrow)
          console.log('[ClickHandler] Pinky pinch - previous slide');
          (window as any).electronAPI.sendKey('left');
        }
      }
      this.pinchStart = null;
      this.currentGesture = 'none';
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
    this.swipeStartPosition = null;
    this.isTrackingSwipe = false;
    this.openHandStartTime = 0;
    document.body.style.userSelect = '';
  }
}
