// handTracker.ts
// Hand tracking using MediaPipe

export interface HandLandmarks {
  landmarks: any[];
  handedness?: any[];
}

export class HandTracker {
  private handLandmarker: any = null;
  private isInitialized = false;
  private wasmPath: string;
  private modelPath: string;

  constructor() {
    // Paths will be set in initialize() after getting the base path from main process
    this.wasmPath = '';
    this.modelPath = '';
  }

  async initialize(): Promise<void> {
    if (this.isInitialized && this.handLandmarker) {
      return;
    }

    try {
      console.log('[HandTracker] Initializing...');
      
      // Use relative path - from dist/renderer/ to dist/assets/mediapipe
      const basePath = '../assets/mediapipe';
      this.wasmPath = `${basePath}/tasks-vision/wasm`;
      this.modelPath = `${basePath}/models/hand_landmarker.task`;
      
      // Set up Module.locateFile globally before MediaPipe loads
      // This will redirect nosimd requests to the regular WASM file
      if (typeof window !== 'undefined') {
        const wasmPath = this.wasmPath;
        // Store original Module if it exists
        const originalModule = (window as any).Module;
        (window as any).Module = (window as any).Module || {};
        
        // Override locateFile to handle path resolution
        const originalLocateFile = (window as any).Module.locateFile;
        (window as any).Module.locateFile = function(path: string, prefix: string) {
          // If MediaPipe is looking for nosimd version, use the regular one
          if (path.includes('nosimd')) {
            path = path.replace('nosimd', '');
          }
          // Resolve relative to the WASM directory
          if (path.startsWith('vision_wasm')) {
            return `${wasmPath}/${path}`;
          }
          // Try original locateFile if it exists
          if (originalLocateFile) {
            return originalLocateFile.call(this, path, prefix);
          }
          return prefix + path;
        };
      }
      
      // Dynamic import of MediaPipe - use relative path with .js extension
      const mediapipePath = `${basePath}/tasks-vision/index.js`;
      
      console.log('[HandTracker] Loading MediaPipe from:', mediapipePath);
      console.log('[HandTracker] WASM path:', this.wasmPath);
      console.log('[HandTracker] Model path:', this.modelPath);
      
      const { FilesetResolver, HandLandmarker } = await import(mediapipePath);
      
      console.log('[HandTracker] WASM path:', this.wasmPath);
      console.log('[HandTracker] Model path:', this.modelPath);

      // Create vision resolver - MediaPipe will load WASM files from the wasmPath
      const vision = await FilesetResolver.forVisionTasks(this.wasmPath);

      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: this.modelPath,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      this.isInitialized = true;
      console.log('[HandTracker] Initialized successfully');
    } catch (error) {
      console.error('[HandTracker] Initialization failed:', error);
      throw error;
    }
  }

  detectForVideo(video: HTMLVideoElement, timestamp: number): HandLandmarks | null {
    if (!this.isInitialized || !this.handLandmarker || !video.videoWidth) {
      return null;
    }

    try {
      return this.handLandmarker.detectForVideo(video, timestamp);
    } catch (error) {
      console.warn('[HandTracker] Detection error:', error);
      return null;
    }
  }
}
