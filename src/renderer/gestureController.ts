// gestureController.ts
// Main controller for the macOS app - handles UI and gesture tracking

import { HandTracker } from './handTracker.js';
import { CursorController } from './cursorController.js';
import { ClickHandler, GestureType } from './clickHandler.js';

export class GestureController {
  private handTracker: HandTracker;
  private cursorController: CursorController;
  private clickHandler: ClickHandler;
  private video!: HTMLVideoElement;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private container: HTMLElement;
  private isActive = false;
  private isMiniMode = false;
  private presentationMode = false;
  private processingInterval: number | null = null;
  
  // Gesture stability tracking
  private gestureHistory: GestureType[] = [];
  private gestureHistorySize = 4; // Require consistent gesture for 4 frames
  private lastStableGesture: GestureType = 'none';

  constructor(container: HTMLElement) {
    this.container = container;
    this.handTracker = new HandTracker();
    this.cursorController = new CursorController(0.25);
    this.clickHandler = new ClickHandler(40, 2.0);
    
    this.createUI();
    this.init();
    this.setupMiniModeListener();
  }

  private setupMiniModeListener(): void {
    if ((window as any).electronAPI && (window as any).electronAPI.onMiniModeChanged) {
      (window as any).electronAPI.onMiniModeChanged((isMini: boolean) => {
        this.isMiniMode = isMini;
        this.updateUIForMode();
      });
    }
  }

  private updateUIForMode(): void {
    const fullUI = document.getElementById('full-ui');
    const miniUI = document.getElementById('mini-ui');
    const miniVideo = document.getElementById('mini-video') as HTMLVideoElement;
    
    if (this.isMiniMode) {
      if (fullUI) fullUI.style.display = 'none';
      if (miniUI) miniUI.style.display = 'flex';
      if (miniVideo && this.video.srcObject) {
        miniVideo.srcObject = this.video.srcObject;
        miniVideo.play().catch(() => {});
      }
    } else {
      if (fullUI) fullUI.style.display = 'block';
      if (miniUI) miniUI.style.display = 'none';
    }
  }

  private createUI(): void {
    this.container.innerHTML = `
      <!-- Full Mode UI -->
      <div id="full-ui" style="padding: 0;">
        <!-- Title bar with window controls -->
        <div style="position: relative; padding: 8px 10px; background: rgba(255, 255, 255, 0.8); border-bottom: 1px solid rgba(0, 0, 0, 0.1); -webkit-app-region: drag; min-height: 38px; box-sizing: border-box;">
          <h2 style="margin: 0; color: #0f172a; font-size: 12px; font-weight: 600; text-align: center;">EyeZero</h2>
          <div style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); display: flex; gap: 4px; -webkit-app-region: no-drag;">
            <button id="mini-btn" style="width: 20px; height: 20px; border: none; background: rgba(34, 197, 94, 0.1); border-radius: 4px; cursor: pointer; font-size: 9px; color: #22c55e; padding: 0; line-height: 20px;" title="Mini Mode">⊡</button>
            <button id="help-btn" style="width: 20px; height: 20px; border: none; background: rgba(79, 70, 229, 0.1); border-radius: 4px; cursor: pointer; font-size: 10px; color: #4f46e5; padding: 0; line-height: 20px;" title="Help">?</button>
            <button id="minimize-btn" style="width: 20px; height: 20px; border: none; background: rgba(0, 0, 0, 0.1); border-radius: 4px; cursor: pointer; font-size: 12px; color: #64748b; padding: 0; line-height: 20px;" title="Minimize">−</button>
            <button id="close-btn" style="width: 20px; height: 20px; border: none; background: rgba(239, 68, 68, 0.1); border-radius: 4px; cursor: pointer; font-size: 12px; color: #ef4444; padding: 0; line-height: 20px;" title="Close">×</button>
          </div>
        </div>
        
        <div style="padding: 12px;">
          <div id="video-container" style="width: 100%; aspect-ratio: 4/3; background: #000; border-radius: 6px; overflow: hidden; margin-bottom: 10px; position: relative;">
            <video id="video" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); background: #000; display: block;"></video>
            <canvas id="hand-canvas" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; transform: scaleX(-1); pointer-events: none;"></canvas>
            <div id="gesture-indicator" style="position: absolute; top: 4px; right: 4px; padding: 2px 6px; background: rgba(0,0,0,0.7); border-radius: 8px; font-size: 9px; color: white; display: none;">
              <span id="gesture-icon">👆</span> <span id="gesture-text">Move</span>
            </div>
            <div id="placeholder" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #94a3b8; text-align: center; z-index: 10; pointer-events: none;">
              <div style="font-size: 20px; margin-bottom: 4px;">📷</div>
              <div style="font-size: 11px;">Camera Off</div>
            </div>
          </div>
          
          <button id="toggle-btn" style="width: 100%; padding: 8px; background: #4f46e5; color: white; border: none; border-radius: 6px; font-weight: 600; font-size: 12px; cursor: pointer; margin-bottom: 8px;" disabled>Loading...</button>
          
          <!-- Presentation Mode Toggle -->
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; padding: 6px 10px; background: rgba(249, 115, 22, 0.05); border-radius: 6px; border: 1px solid rgba(249, 115, 22, 0.1);">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 12px;">🎯</span>
              <span style="font-size: 11px; color: #475569; font-weight: 500;">Slides Mode</span>
            </div>
            <label style="position: relative; display: inline-block; width: 36px; height: 20px;">
              <input type="checkbox" id="presentation-toggle" style="opacity: 0; width: 0; height: 0;">
              <span id="presentation-slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: 0.3s; border-radius: 20px;"></span>
            </label>
          </div>
          
          <div id="status" style="font-size: 10px; color: #64748b; text-align: center;">Initializing...</div>
        </div>
      </div>
      
      <!-- Mini Mode UI -->
      <div id="mini-ui" style="display: none; flex-direction: column; height: 100%; background: rgba(15, 23, 42, 0.95); border-radius: 12px; overflow: hidden;">
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; -webkit-app-region: drag;">
          <span style="font-size: 10px; color: #94a3b8; font-weight: 600;">EyeZero</span>
          <div style="display: flex; gap: 4px; -webkit-app-region: no-drag;">
            <button id="mini-expand-btn" style="width: 20px; height: 20px; border: none; background: rgba(34, 197, 94, 0.2); border-radius: 4px; cursor: pointer; font-size: 10px; color: #22c55e;" title="Expand">⊞</button>
            <button id="mini-close-btn" style="width: 20px; height: 20px; border: none; background: rgba(239, 68, 68, 0.2); border-radius: 4px; cursor: pointer; font-size: 10px; color: #ef4444;" title="Close">×</button>
          </div>
        </div>
        <div style="flex: 1; position: relative; margin: 0 6px 6px 6px; border-radius: 8px; overflow: hidden;">
          <video id="mini-video" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); background: #000;"></video>
          <div id="mini-status" style="position: absolute; bottom: 4px; left: 4px; right: 4px; text-align: center; font-size: 9px; color: white; background: rgba(0,0,0,0.6); padding: 2px 6px; border-radius: 4px;">Ready</div>
        </div>
      </div>
      
      <!-- Help Modal -->
      <div id="help-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.95); z-index: 1000; flex-direction: column;">
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.1);">
          <h3 style="margin: 0; color: white; font-size: 13px; font-weight: 600;">Gesture Guide</h3>
          <button id="close-help" style="width: 24px; height: 24px; border: none; background: rgba(255,255,255,0.1); border-radius: 6px; cursor: pointer; color: white; font-size: 14px;">×</button>
        </div>
        <div style="flex: 1; overflow-y: auto; padding: 12px; color: #e2e8f0; font-size: 11px; line-height: 1.5;">
          <div style="margin-bottom: 12px;">
            <div style="font-weight: 600; color: #22c55e; margin-bottom: 6px;">🖐️ Basic</div>
            <div style="padding-left: 4px;">
              <div>👆 Point index → Move cursor</div>
              <div>🤏 Index + thumb → Click</div>
              <div>🤏🤏 Double pinch → Double-click</div>
              <div>✌️ Middle + thumb → Right-click</div>
            </div>
          </div>
          <div style="margin-bottom: 12px;">
            <div style="font-weight: 600; color: #f97316; margin-bottom: 6px;">🎯 Slides Mode</div>
            <div style="padding-left: 4px;">
              <div>👋← Swipe left → Next slide</div>
              <div>👋→ Swipe right → Prev slide</div>
            </div>
          </div>
          <div>
            <div style="font-weight: 600; color: #4f46e5; margin-bottom: 6px;">💡 Tips</div>
            <div style="padding-left: 4px;">
              <div>• Hand 1-2 feet from camera</div>
              <div>• Good lighting helps</div>
              <div>• Extend other fingers when pinching</div>
            </div>
          </div>
        </div>
      </div>
      
      <style>
        #presentation-toggle:checked + #presentation-slider {
          background-color: #f97316;
        }
        #presentation-slider:before {
          position: absolute;
          content: "";
          height: 14px;
          width: 14px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.3s;
          border-radius: 50%;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
        #presentation-toggle:checked + #presentation-slider:before {
          transform: translateX(16px);
        }
      </style>
    `;

    // Event listeners
    const toggleBtn = document.getElementById('toggle-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggle());
    }

    const closeBtn = document.getElementById('close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if ((window as any).electronAPI?.closeWindow) {
          (window as any).electronAPI.closeWindow();
        }
      });
    }

    const minimizeBtn = document.getElementById('minimize-btn');
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', () => {
        if ((window as any).electronAPI?.minimizeWindow) {
          (window as any).electronAPI.minimizeWindow();
        }
      });
    }

    // Mini mode buttons
    const miniBtn = document.getElementById('mini-btn');
    if (miniBtn) {
      miniBtn.addEventListener('click', () => {
        if ((window as any).electronAPI?.toggleMiniMode) {
          (window as any).electronAPI.toggleMiniMode();
        }
      });
    }

    const miniExpandBtn = document.getElementById('mini-expand-btn');
    if (miniExpandBtn) {
      miniExpandBtn.addEventListener('click', () => {
        if ((window as any).electronAPI?.toggleMiniMode) {
          (window as any).electronAPI.toggleMiniMode();
        }
      });
    }

    const miniCloseBtn = document.getElementById('mini-close-btn');
    if (miniCloseBtn) {
      miniCloseBtn.addEventListener('click', () => {
        if ((window as any).electronAPI?.closeWindow) {
          (window as any).electronAPI.closeWindow();
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

    // Presentation mode toggle
    const presentationToggle = document.getElementById('presentation-toggle') as HTMLInputElement;
    if (presentationToggle) {
      presentationToggle.addEventListener('change', () => {
        this.presentationMode = presentationToggle.checked;
        this.clickHandler.setSwipeEnabled(this.presentationMode);
        console.log('[GestureController] Presentation mode:', this.presentationMode);
      });
    }

    this.video = document.getElementById('video') as HTMLVideoElement;
    this.canvas = document.getElementById('hand-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    
    // Listen for permission alerts
    if ((window as any).electronAPI?.onPermissionAlert) {
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
      
      this.clickHandler.setSwipeEnabled(false);
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
      const miniStatus = document.getElementById('mini-status');
      const setStatus = (text: string) => {
        if (status) status.textContent = text;
        if (miniStatus) miniStatus.textContent = text;
      };
      
      setStatus('Requesting camera...');

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not available');
      }

      if ((window as any).electronAPI?.requestCameraPermission) {
        const permResult = await (window as any).electronAPI.requestCameraPermission();
        if (permResult.status !== 'granted') {
          throw new Error('Camera permission denied');
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } }
      });
      
      if (!stream || stream.getVideoTracks().length === 0) {
        throw new Error('No video track');
      }

      this.video.onplay = () => {
        const placeholder = document.getElementById('placeholder');
        if (placeholder) placeholder.style.display = 'none';
        // Set canvas size to match video
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
      };

      this.video.srcObject = stream;
      await new Promise(resolve => setTimeout(resolve, 100));
      await this.video.play();

      const miniVideo = document.getElementById('mini-video') as HTMLVideoElement;
      if (miniVideo) {
        miniVideo.srcObject = stream;
        miniVideo.play().catch(() => {});
      }

      const placeholder = document.getElementById('placeholder');
      if (placeholder) placeholder.style.display = 'none';

      // Show gesture indicator
      const gestureIndicator = document.getElementById('gesture-indicator');
      if (gestureIndicator) gestureIndicator.style.display = 'block';

      this.isActive = true;
      this.cursorController.show();
      this.processFrame();

      const toggleBtn = document.getElementById('toggle-btn') as HTMLButtonElement;
      if (toggleBtn) {
        toggleBtn.textContent = 'Stop Control';
        toggleBtn.style.background = '#ef4444';
      }

      setStatus('Active - Tracking');
    } catch (error) {
      console.error('Camera error:', error);
      const status = document.getElementById('status');
      if (status) {
        status.textContent = 'Error: ' + (error instanceof Error ? error.message : String(error));
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

    const miniVideo = document.getElementById('mini-video') as HTMLVideoElement;
    if (miniVideo) miniVideo.srcObject = null;

    const placeholder = document.getElementById('placeholder');
    if (placeholder) placeholder.style.display = 'block';

    const gestureIndicator = document.getElementById('gesture-indicator');
    if (gestureIndicator) gestureIndicator.style.display = 'none';

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.cursorController.hide();
    this.clickHandler.reset();
    this.gestureHistory = [];
    this.lastStableGesture = 'none';

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
    const miniStatus = document.getElementById('mini-status');
    if (status) status.textContent = 'Ready';
    if (miniStatus) miniStatus.textContent = 'Ready';
  }

  private processFrame(): void {
    if (!this.isActive) return;

    try {
      const now = performance.now();
      const results = this.handTracker.detectForVideo(this.video, now);

      // Clear canvas
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      if (results && results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];
        this.drawHand(landmarks);
        this.handleLandmarks(landmarks);
      } else {
        // No hand detected - update indicator
        this.updateGestureIndicator('none');
      }
    } catch (e) {
      console.warn('Frame processing error:', e);
    }

    this.processingInterval = requestAnimationFrame(() => this.processFrame());
  }

  private drawHand(landmarks: any[]): void {
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Hand connections (MediaPipe hand landmark indices)
    const connections = [
      // Thumb
      [0, 1], [1, 2], [2, 3], [3, 4],
      // Index
      [0, 5], [5, 6], [6, 7], [7, 8],
      // Middle
      [0, 9], [9, 10], [10, 11], [11, 12],
      // Ring
      [0, 13], [13, 14], [14, 15], [15, 16],
      // Pinky
      [0, 17], [17, 18], [18, 19], [19, 20],
      // Palm
      [5, 9], [9, 13], [13, 17]
    ];

    // Draw connections
    this.ctx.strokeStyle = 'rgba(79, 70, 229, 0.6)';
    this.ctx.lineWidth = 2;
    
    for (const [i, j] of connections) {
      const p1 = landmarks[i];
      const p2 = landmarks[j];
      this.ctx.beginPath();
      this.ctx.moveTo(p1.x * w, p1.y * h);
      this.ctx.lineTo(p2.x * w, p2.y * h);
      this.ctx.stroke();
    }

    // Draw landmarks
    for (let i = 0; i < landmarks.length; i++) {
      const p = landmarks[i];
      const x = p.x * w;
      const y = p.y * h;
      
      // Different colors for key landmarks
      if (i === 4) {
        // Thumb tip - yellow
        this.ctx.fillStyle = '#facc15';
      } else if (i === 8) {
        // Index tip - green
        this.ctx.fillStyle = '#22c55e';
      } else if (i === 12) {
        // Middle tip - orange
        this.ctx.fillStyle = '#f97316';
      } else {
        // Others - purple
        this.ctx.fillStyle = 'rgba(79, 70, 229, 0.8)';
      }
      
      this.ctx.beginPath();
      this.ctx.arc(x, y, i === 4 || i === 8 || i === 12 ? 6 : 4, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Draw pinch indicators
    const thumb = landmarks[4];
    const index = landmarks[8];
    const middle = landmarks[12];
    
    const indexDist = Math.hypot(index.x - thumb.x, index.y - thumb.y);
    const middleDist = Math.hypot(middle.x - thumb.x, middle.y - thumb.y);
    
    // Draw line between pinching fingers
    if (indexDist < 0.08) {
      this.ctx.strokeStyle = indexDist < 0.04 ? '#22c55e' : 'rgba(34, 197, 94, 0.5)';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.moveTo(thumb.x * w, thumb.y * h);
      this.ctx.lineTo(index.x * w, index.y * h);
      this.ctx.stroke();
    }
    
    if (middleDist < 0.08) {
      this.ctx.strokeStyle = middleDist < 0.04 ? '#f97316' : 'rgba(249, 115, 22, 0.5)';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.moveTo(thumb.x * w, thumb.y * h);
      this.ctx.lineTo(middle.x * w, middle.y * h);
      this.ctx.stroke();
    }
  }

  private updateGestureIndicator(gesture: GestureType): void {
    const icon = document.getElementById('gesture-icon');
    const text = document.getElementById('gesture-text');
    const indicator = document.getElementById('gesture-indicator');
    
    if (!icon || !text || !indicator) return;
    
    switch (gesture) {
      case 'left-pinch':
        icon.textContent = '🤏';
        text.textContent = 'Click';
        indicator.style.background = 'rgba(34, 197, 94, 0.9)';
        break;
      case 'right-pinch':
        icon.textContent = '✌️';
        text.textContent = 'Right-Click';
        indicator.style.background = 'rgba(249, 115, 22, 0.9)';
        break;
      default:
        icon.textContent = '👆';
        text.textContent = 'Moving';
        indicator.style.background = 'rgba(0, 0, 0, 0.7)';
    }
  }

  private getStableGesture(currentGesture: GestureType): GestureType {
    // Add to history
    this.gestureHistory.push(currentGesture);
    if (this.gestureHistory.length > this.gestureHistorySize) {
      this.gestureHistory.shift();
    }
    
    // Check if all recent frames agree
    if (this.gestureHistory.length >= this.gestureHistorySize) {
      const allSame = this.gestureHistory.every(g => g === currentGesture);
      if (allSame) {
        this.lastStableGesture = currentGesture;
      }
    }
    
    // For releasing, be more responsive
    if (currentGesture === 'none' && this.lastStableGesture !== 'none') {
      // Check if last 2 frames show no pinch
      const recentNone = this.gestureHistory.slice(-2).every(g => g === 'none');
      if (recentNone) {
        this.lastStableGesture = 'none';
      }
    }
    
    return this.lastStableGesture;
  }

  private handleLandmarks(landmarks: any[]): void {
    const thumb = landmarks[4];
    const index = landmarks[8];
    const middle = landmarks[12];
    const ring = landmarks[16];

    // Calculate pinch distances
    const indexThumbDist = Math.hypot(index.x - thumb.x, index.y - thumb.y);
    const middleThumbDist = Math.hypot(middle.x - thumb.x, middle.y - thumb.y);
    const ringThumbDist = Math.hypot(ring.x - thumb.x, ring.y - thumb.y);
    
    // Stricter thresholds for better accuracy
    const pinchThreshold = 0.04; // Tighter threshold
    const exclusionThreshold = 0.06; // Other fingers should be farther
    
    let rawGesture: GestureType = 'none';
    
    const isIndexPinch = indexThumbDist < pinchThreshold;
    const isMiddlePinch = middleThumbDist < pinchThreshold;
    
    // For left click: index must be pinching AND middle must NOT be close
    // For right click: middle must be pinching AND index must NOT be close
    
    if (isIndexPinch && !isMiddlePinch && middleThumbDist > exclusionThreshold) {
      rawGesture = 'left-pinch';
    } else if (isMiddlePinch && !isIndexPinch && indexThumbDist > exclusionThreshold) {
      rawGesture = 'right-pinch';
    } else if (isIndexPinch && isMiddlePinch) {
      // Both pinching - use the closer one, but require significant difference
      const diff = Math.abs(indexThumbDist - middleThumbDist);
      if (diff > 0.01) {
        rawGesture = indexThumbDist < middleThumbDist ? 'left-pinch' : 'right-pinch';
      }
      // If too similar, ignore (no gesture)
    }
    
    // Apply stability filter
    const stableGesture = this.getStableGesture(rawGesture);
    
    // Update UI indicator
    this.updateGestureIndicator(stableGesture);

    const pos = this.cursorController.updatePosition(index.x, index.y, stableGesture !== 'none');

    if ((window as any).electronAPI) {
      let state = '';
      if (stableGesture === 'left-pinch') state = 'pinching';
      else if (stableGesture === 'right-pinch') state = 'right-pinching';
      (window as any).electronAPI.updateCursor(pos.x, pos.y, state);
    }

    this.clickHandler.handleInteraction(
      pos.x,
      pos.y,
      stableGesture,
      (isDragging) => {
        this.cursorController.setDragging(isDragging);
        if ((window as any).electronAPI) {
          (window as any).electronAPI.updateCursor(pos.x, pos.y, isDragging ? 'dragging' : '');
        }
      },
      (direction) => {
        if (this.presentationMode && (window as any).electronAPI?.sendKey) {
          if (direction === 'left') {
            (window as any).electronAPI.sendKey('right');
          } else {
            (window as any).electronAPI.sendKey('left');
          }
        }
      }
    );
  }
}
