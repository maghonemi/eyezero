// gestureController.ts
// Main controller for the macOS app - handles UI and gesture tracking

import { HandTracker } from './handTracker.js';
import { CursorController } from './cursorController.js';
import { ClickHandler, GestureType } from './clickHandler.js';

export class GestureController {
  private handTracker: HandTracker;
  private cursorController: CursorController;
  private clickHandler: ClickHandler;
  private video!: HTMLVideoElement; // Assigned in createUI()
  private container: HTMLElement;
  private isActive = false;
  private processingInterval: number | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.handTracker = new HandTracker();
    this.cursorController = new CursorController(0.25);
    this.clickHandler = new ClickHandler(40, 2.0);
    
    this.createUI();
    this.init();
  }

  private createUI(): void {
    this.container.innerHTML = `
      <div style="padding: 0;">
        <!-- Title bar with window controls -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(255, 255, 255, 0.8); border-bottom: 1px solid rgba(0, 0, 0, 0.1); -webkit-app-region: drag;">
          <h2 style="margin: 0; color: #0f172a; font-size: 16px; font-weight: 600;">EyeZero</h2>
          <div style="display: flex; gap: 8px; -webkit-app-region: no-drag;">
            <button id="help-btn" style="width: 28px; height: 28px; border: none; background: rgba(79, 70, 229, 0.1); border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; color: #4f46e5;" title="Help">?</button>
            <button id="minimize-btn" style="width: 28px; height: 28px; border: none; background: rgba(0, 0, 0, 0.1); border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; color: #64748b;" title="Minimize">−</button>
            <button id="close-btn" style="width: 28px; height: 28px; border: none; background: rgba(239, 68, 68, 0.1); border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; color: #ef4444;" title="Close">×</button>
          </div>
        </div>
        
        <div style="padding: 20px;">
          <div id="video-container" style="width: 100%; aspect-ratio: 16/9; background: #000; border-radius: 8px; overflow: hidden; margin-bottom: 16px; position: relative;">
            <video id="video" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); background: #000; display: block;"></video>
            <div id="placeholder" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #94a3b8; text-align: center; z-index: 10; pointer-events: none;">
              <div style="font-size: 24px; margin-bottom: 8px;">📷</div>
              <div>Camera Off</div>
            </div>
          </div>
          <button id="toggle-btn" style="width: 100%; padding: 12px; background: #4f46e5; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; margin-bottom: 12px;" disabled>Loading AI...</button>
          <div id="status" style="font-size: 12px; color: #64748b; text-align: center; margin-bottom: 12px;">Initializing...</div>
          
          <!-- Gesture Guide -->
          <div id="gesture-guide" style="background: rgba(79, 70, 229, 0.05); border-radius: 8px; padding: 12px; border: 1px solid rgba(79, 70, 229, 0.1);">
            <div style="font-size: 11px; font-weight: 600; color: #4f46e5; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Gesture Controls</div>
            <div style="display: grid; gap: 6px; font-size: 12px; color: #475569;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 16px;">👆</span>
                <span><strong>Move</strong> — Point with index finger</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 16px;">🤏</span>
                <span><strong>Click</strong> — Pinch index + thumb</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 16px;">🤏🤏</span>
                <span><strong>Double-click</strong> — Quick double pinch</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 16px;">🖕</span>
                <span><strong>Right-click</strong> — Pinch middle + thumb</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 16px;">✊</span>
                <span><strong>Scroll</strong> — Pinch + drag up/down</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Help Modal -->
      <div id="help-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center;">
        <div style="background: white; border-radius: 16px; padding: 24px; max-width: 320px; margin: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
          <h3 style="margin: 0 0 16px 0; color: #0f172a; font-size: 18px;">How to Use EyeZero</h3>
          <div style="color: #475569; font-size: 14px; line-height: 1.6;">
            <p style="margin: 0 0 12px 0;"><strong>1. Position your hand</strong> in front of the camera, about 1-2 feet away.</p>
            <p style="margin: 0 0 12px 0;"><strong>2. Point with your index finger</strong> to move the cursor on screen.</p>
            <p style="margin: 0 0 12px 0;"><strong>3. Pinch your index finger and thumb together</strong> to click.</p>
            <p style="margin: 0 0 12px 0;"><strong>4. Double-pinch quickly</strong> for a double-click.</p>
            <p style="margin: 0 0 12px 0;"><strong>5. Pinch your middle finger and thumb</strong> for a right-click (context menu).</p>
            <p style="margin: 0;"><strong>6. Pinch and drag</strong> to scroll web pages.</p>
          </div>
          <button id="close-help" style="width: 100%; margin-top: 16px; padding: 10px; background: #4f46e5; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Got it!</button>
        </div>
      </div>
    `;

    const toggleBtn = document.getElementById('toggle-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggle());
    }

    const closeBtn = document.getElementById('close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if ((window as any).electronAPI && (window as any).electronAPI.closeWindow) {
          (window as any).electronAPI.closeWindow();
        }
      });
    }

    const minimizeBtn = document.getElementById('minimize-btn');
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', () => {
        if ((window as any).electronAPI && (window as any).electronAPI.minimizeWindow) {
          (window as any).electronAPI.minimizeWindow();
        }
      });
    }

    // Help modal toggle
    const helpBtn = document.getElementById('help-btn');
    const helpModal = document.getElementById('help-modal');
    const closeHelp = document.getElementById('close-help');
    
    if (helpBtn && helpModal) {
      helpBtn.addEventListener('click', () => {
        helpModal.style.display = 'flex';
      });
      helpModal.addEventListener('click', (e) => {
        if (e.target === helpModal) {
          helpModal.style.display = 'none';
        }
      });
    }
    if (closeHelp && helpModal) {
      closeHelp.addEventListener('click', () => {
        helpModal.style.display = 'none';
      });
    }

    this.video = document.getElementById('video') as HTMLVideoElement;
    
    // Listen for permission alerts
    if ((window as any).electronAPI && (window as any).electronAPI.onPermissionAlert) {
      (window as any).electronAPI.onPermissionAlert((message: string) => {
        alert(message);
      });
    }
  }

  private async init(): Promise<void> {
    try {
      const status = document.getElementById('status');
      if (status) status.textContent = 'Loading MediaPipe...';
      
      await this.handTracker.initialize();
      
      if (status) status.textContent = 'Ready';
      const toggleBtn = document.getElementById('toggle-btn') as HTMLButtonElement;
      if (toggleBtn) {
        toggleBtn.disabled = false;
        toggleBtn.textContent = 'Start Control';
      }
    } catch (error) {
      console.error('Initialization failed:', error);
      const status = document.getElementById('status');
      if (status) status.textContent = 'Error: ' + (error as Error).message;
    }
  }

  private async toggle(): Promise<void> {
    if (this.isActive) {
      this.stop();
    } else {
      await this.start();
    }
  }

  private async start(): Promise<void> {
    try {
      const status = document.getElementById('status');
      if (status) status.textContent = 'Requesting camera...';

      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not available. Please use a modern browser.');
      }

      // Request camera permission from main process first
      if ((window as any).electronAPI && (window as any).electronAPI.requestCameraPermission) {
        const permResult = await (window as any).electronAPI.requestCameraPermission();
        console.log('[GestureController] Camera permission result:', permResult);
        
        if (permResult.status !== 'granted') {
          throw new Error('Camera permission denied. Please grant access in System Preferences > Privacy > Camera.');
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 }
        }
      });
      
      if (!stream || stream.getVideoTracks().length === 0) {
        throw new Error('No video track in camera stream');
      }

      // Set up video element event listeners
      this.video.onloadedmetadata = () => {
        console.log('[GestureController] Video metadata loaded:', this.video.videoWidth, 'x', this.video.videoHeight);
        if (this.video.videoWidth === 0 || this.video.videoHeight === 0) {
          console.warn('[GestureController] Video dimensions are zero!');
          if (status) status.textContent = 'Camera stream has no dimensions';
        }
      };

      this.video.onplay = () => {
        console.log('[GestureController] Video started playing');
        const placeholder = document.getElementById('placeholder');
        if (placeholder) placeholder.style.display = 'none';
      };

      this.video.onerror = (e) => {
        console.error('[GestureController] Video error:', e);
        const errorMsg = 'Video error: ' + (e as any).message || 'Unknown video error';
        if (status) status.textContent = errorMsg;
      };
      
      this.video.onloadeddata = () => {
        console.log('[GestureController] Video data loaded');
      };
      
      this.video.oncanplay = () => {
        console.log('[GestureController] Video can play');
      };

      this.video.srcObject = stream;
      
      // Wait a bit for the stream to be ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Force play
      try {
        console.log('[GestureController] Attempting to play video...');
        await this.video.play();
        console.log('[GestureController] Video play() succeeded');
      } catch (playError: any) {
        console.error('[GestureController] Video play() failed:', playError);
        const errorMsg = playError.name === 'NotAllowedError'
          ? 'Video autoplay blocked. Please interact with the page first.'
          : `Video play failed: ${playError.message || playError}`;
        if (status) status.textContent = errorMsg;
        // Stop the stream
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      // Double check video is actually playing
      if (this.video.paused) {
        console.error('[GestureController] Video is still paused after play()');
        if (status) status.textContent = 'Video failed to start - still paused';
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      
      // Check if video has valid dimensions
      if (this.video.videoWidth === 0 || this.video.videoHeight === 0) {
        console.warn('[GestureController] Video has zero dimensions, waiting...');
        // Wait a bit more for dimensions
        await new Promise(resolve => setTimeout(resolve, 500));
        if (this.video.videoWidth === 0 || this.video.videoHeight === 0) {
          console.error('[GestureController] Video still has zero dimensions');
          if (status) status.textContent = 'Camera stream has no video data';
          stream.getTracks().forEach(track => track.stop());
          return;
        }
      }

      const placeholder = document.getElementById('placeholder');
      if (placeholder) placeholder.style.display = 'none';

      this.isActive = true;
      this.cursorController.show();
      this.processFrame();

      const toggleBtn = document.getElementById('toggle-btn') as HTMLButtonElement;
      if (toggleBtn) {
        toggleBtn.textContent = 'Stop Control';
        toggleBtn.style.background = '#ef4444';
      }

      if (status) status.textContent = 'Active - Tracking your hand';
    } catch (error) {
      console.error('Camera error:', error);
      const status = document.getElementById('status');
      if (status) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        status.textContent = 'Error: ' + errorMsg;
      }
    }
  }

  private stop(): void {
    this.isActive = false;

    const stream = this.video.srcObject as MediaStream;
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      this.video.srcObject = null;
    }

    const placeholder = document.getElementById('placeholder');
    if (placeholder) placeholder.style.display = 'block';

    this.cursorController.hide();
    this.clickHandler.reset();

    if (this.processingInterval) {
      cancelAnimationFrame(this.processingInterval);
      this.processingInterval = null;
    }

    const toggleBtn = document.getElementById('toggle-btn') as HTMLButtonElement;
    if (toggleBtn) {
      toggleBtn.textContent = 'Start Control';
      toggleBtn.style.background = '#4f46e5';
    }

    const status = document.getElementById('status');
    if (status) status.textContent = 'Ready';
  }

  private processFrame(): void {
    if (!this.isActive) return;

    try {
      const now = performance.now();
      const results = this.handTracker.detectForVideo(this.video, now);

      if (results && results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];
        this.handleLandmarks(landmarks);
      }
    } catch (e) {
      console.warn('Frame processing error:', e);
    }

    this.processingInterval = requestAnimationFrame(() => this.processFrame());
  }

  private handleLandmarks(landmarks: any[]): void {
    const thumb = landmarks[4];   // Thumb tip
    const index = landmarks[8];   // Index finger tip
    const middle = landmarks[12]; // Middle finger tip

    // Calculate pinch distances
    const indexThumbDist = Math.hypot(index.x - thumb.x, index.y - thumb.y);
    const middleThumbDist = Math.hypot(middle.x - thumb.x, middle.y - thumb.y);
    
    const pinchThreshold = 0.05;
    
    // Determine gesture type
    let gesture: GestureType = 'none';
    
    // Priority: if both are pinching, prefer the closer one
    const isIndexPinch = indexThumbDist < pinchThreshold;
    const isMiddlePinch = middleThumbDist < pinchThreshold;
    
    if (isIndexPinch && isMiddlePinch) {
      // Both pinching - use whichever is closer
      gesture = indexThumbDist < middleThumbDist ? 'left-pinch' : 'right-pinch';
    } else if (isIndexPinch) {
      gesture = 'left-pinch';
    } else if (isMiddlePinch) {
      gesture = 'right-pinch';
    }

    const pos = this.cursorController.updatePosition(index.x, index.y, gesture !== 'none');

    // Update cursor via Electron IPC
    if ((window as any).electronAPI) {
      let state = '';
      if (gesture === 'left-pinch') state = 'pinching';
      else if (gesture === 'right-pinch') state = 'right-pinching';
      (window as any).electronAPI.updateCursor(pos.x, pos.y, state);
    }

    this.clickHandler.handleInteraction(
      pos.x,
      pos.y,
      gesture,
      (isDragging) => {
        this.cursorController.setDragging(isDragging);
        if ((window as any).electronAPI) {
          const state = isDragging ? 'dragging' : '';
          (window as any).electronAPI.updateCursor(pos.x, pos.y, state);
        }
      }
    );
  }
}
