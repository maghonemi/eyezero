// main.ts
// Electron main process - manages application lifecycle

import { app, BrowserWindow, ipcMain, screen, systemPreferences, shell } from 'electron';
import * as path from 'path';

// Import robotjs with error handling
let robot: any;
try {
  robot = require('robotjs');
  console.log('[Main] robotjs loaded successfully');
} catch (error) {
  console.warn('[Main] robotjs not available, falling back to AppleScript:', error);
  robot = null;
}

let mainWindow: BrowserWindow | null = null;
let cursorWindow: BrowserWindow | null = null;
let isMiniMode = false;

// Window sizes
const FULL_SIZE = { width: 280, height: 340 };
const MINI_SIZE = { width: 130, height: 110 };

// Ensure the app name is consistent for permissions/bundle identity
app.setName('EyeZero');
app.setAboutPanelOptions({ applicationName: 'EyeZero' });

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: FULL_SIZE.width,
    height: FULL_SIZE.height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: false, // Show in dock
    show: true, // Show window immediately
    resizable: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Don't open DevTools in production
  // mainWindow.webContents.openDevTools();

  // Position window in bottom-right corner
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  mainWindow.setPosition(width - FULL_SIZE.width - 20, height - FULL_SIZE.height - 20);

  mainWindow.on('closed', () => {
    mainWindow = null;
    // Close cursor window when main window closes
    if (cursorWindow) {
      cursorWindow.close();
      cursorWindow = null;
    }
    // Don't quit - allow reopening via dock/activate event
  });
}

function createCursorWindow(): void {
  cursorWindow = new BrowserWindow({
    width: 30,
    height: 30,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: false,
    show: true, // Show initially
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  cursorWindow.loadFile(path.join(__dirname, '../renderer/cursor.html'));
  cursorWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  cursorWindow.setIgnoreMouseEvents(true, { forward: true });

  cursorWindow.on('closed', () => {
    cursorWindow = null;
  });
}

app.whenReady().then(() => {

  // Request camera permission on macOS - do this early
  if (process.platform === 'darwin') {
    // Check current permission status first
    const cameraStatus = systemPreferences.getMediaAccessStatus('camera');
    console.log('[Main] Camera permission status:', cameraStatus);
    
    const requestCamera = () => {
      console.log('[Main] Requesting camera permission...');
      return systemPreferences.askForMediaAccess('camera').then((granted) => {
        if (granted) {
          console.log('[Main] ✓ Camera permission granted');
        } else {
          console.log('[Main] ✗ Camera permission denied');
          // Show alert to user after window loads
          setTimeout(() => {
            if (mainWindow) {
              mainWindow.webContents.executeJavaScript(`
                alert('Camera permission is required for EyeZero to work.\\n\\nPlease grant camera access in:\\nSystem Preferences > Privacy & Security > Camera\\n\\nThen restart the app.');
              `).catch(() => {});
            }
          }, 1000);
          // Open the Camera privacy pane to help the user
          try {
            shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Camera');
          } catch (err) {
            console.warn('[Main] Could not open Camera privacy pane:', err);
          }
        }
        return granted;
      }).catch((error) => {
        console.error('[Main] Error requesting camera permission:', error);
        return false;
      });
    };

    if (cameraStatus !== 'granted') {
      requestCamera();
    } else {
      console.log('[Main] ✓ Camera permission already granted');
    }
    
    // Check accessibility permission (required for robotjs to control mouse)
    const hasAccess = systemPreferences.isTrustedAccessibilityClient(false);
    if (!hasAccess) {
      console.warn('⚠️  Accessibility permission required for mouse control!');
      console.warn('Please grant Accessibility permission in:');
      console.warn('System Preferences > Security & Privacy > Privacy > Accessibility');
      console.warn('Add Electron (or Terminal if running from terminal) to the list');
      console.warn('Then restart the app.');
      
      // Show dialog to user
      if (mainWindow) {
        mainWindow.webContents.executeJavaScript(`
          alert('⚠️ Accessibility Permission Required\\n\\nPlease grant Accessibility permission in:\\nSystem Preferences > Security & Privacy > Privacy > Accessibility\\n\\nThen restart the app.');
        `).catch(() => {});
      }
    } else {
      console.log('✓ Accessibility permission granted');
    }
  }

  createMainWindow();
  createCursorWindow();
  
  // Log to main window console as well for debugging
  if (mainWindow) {
    mainWindow.webContents.on('did-finish-load', () => {
      console.log('[Main] Window loaded, IPC handlers ready');
      console.log('[Main] robotjs available:', robot !== null);
      
      // Request camera permission again after window loads (sometimes needed)
      if (process.platform === 'darwin') {
        const cameraStatus = systemPreferences.getMediaAccessStatus('camera');
        console.log('[Main] Camera status after window load:', cameraStatus);
        
        if (cameraStatus !== 'granted') {
          systemPreferences.askForMediaAccess('camera').then((granted) => {
            console.log('[Main] Camera permission result after window load:', granted);
            if (!granted) {
              try {
                shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Camera');
              } catch (err) {
                console.warn('[Main] Could not open Camera privacy pane:', err);
              }
            }
          });
        }
      }
    });
  }

  app.on('activate', () => {
    // Recreate windows if they don't exist (e.g., after closing)
    if (!mainWindow) {
      createMainWindow();
    }
    if (!cursorWindow) {
      createCursorWindow();
    }
    // Focus the main window if it exists
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
  
  // Ensure dock icon stays visible (macOS only)
  if (process.platform === 'darwin' && app.dock) {
    app.dock.show();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers
ipcMain.handle('get-cursor-window', () => {
  return cursorWindow?.webContents.id;
});

ipcMain.handle('request-camera-permission', async () => {
  try {
    const status = systemPreferences.getMediaAccessStatus('camera');
    if (status === 'granted') {
      return { status: 'granted' };
    }
    const granted = await systemPreferences.askForMediaAccess('camera');
    const finalStatus = systemPreferences.getMediaAccessStatus('camera');
    return { status: finalStatus, granted };
  } catch (error) {
    console.error('[Main] request-camera-permission error:', error);
    return { status: 'error', error: (error as Error)?.message || String(error) };
  }
});

// Throttle mouse movement to avoid lag
let lastMouseUpdate = 0;
let lastMouseX = -1;
let lastMouseY = -1;
const MOUSE_UPDATE_INTERVAL = 16; // ~60fps max
const MIN_MOUSE_DISTANCE = 2; // Only move if moved at least 2 pixels

ipcMain.on('update-cursor', (event, x: number, y: number, state: string) => {
  const now = Date.now();
  const roundedX = Math.round(x);
  const roundedY = Math.round(y);
  
  // Update cursor window immediately (lightweight)
  if (cursorWindow) {
    cursorWindow.setPosition(roundedX - 15, roundedY - 15); // Center on cursor (30px / 2 = 15)
    // Send relative position (0, 0) since window is already positioned
    cursorWindow.webContents.send('cursor-update', 0, 0, state);
  }
  
  // Throttle system mouse movement to avoid lag
  const distance = Math.hypot(roundedX - lastMouseX, roundedY - lastMouseY);
  const timeSinceLastUpdate = now - lastMouseUpdate;
  
  if (distance >= MIN_MOUSE_DISTANCE && timeSinceLastUpdate >= MOUSE_UPDATE_INTERVAL) {
    lastMouseX = roundedX;
    lastMouseY = roundedY;
    lastMouseUpdate = now;
    
    // Move the actual system mouse cursor (throttled)
    if (robot) {
      try {
        robot.moveMouse(roundedX, roundedY);
      } catch (error) {
        console.warn('Failed to move mouse with robotjs:', error);
        // Fallback to AppleScript
        moveMouseWithAppleScript(roundedX, roundedY);
      }
    } else if (process.platform === 'darwin') {
      // Fallback to AppleScript if robotjs is not available
      moveMouseWithAppleScript(roundedX, roundedY);
    }
  }
});

function moveMouseWithAppleScript(x: number, y: number): void {
  const { exec } = require('child_process');
  const script = `tell application "System Events" to set position of mouse to {${x}, ${y}}`;
  exec(`osascript -e '${script.replace(/'/g, "\\'")}'`, (error: any) => {
    if (error) {
      console.warn('Failed to move mouse via AppleScript:', error);
    }
  });
}

ipcMain.on('toggle-cursor-visibility', (event, visible: boolean) => {
  if (cursorWindow) {
    if (visible) {
      cursorWindow.show();
    } else {
      cursorWindow.hide();
    }
    cursorWindow.webContents.send('cursor-visibility', visible);
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

ipcMain.on('window-minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

// Mini mode toggle
ipcMain.on('toggle-mini-mode', () => {
  if (!mainWindow) return;
  
  isMiniMode = !isMiniMode;
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  if (isMiniMode) {
    mainWindow.setSize(MINI_SIZE.width, MINI_SIZE.height);
    mainWindow.setPosition(width - MINI_SIZE.width - 20, height - MINI_SIZE.height - 20);
  } else {
    mainWindow.setSize(FULL_SIZE.width, FULL_SIZE.height);
    mainWindow.setPosition(width - FULL_SIZE.width - 20, height - FULL_SIZE.height - 20);
  }
  
  mainWindow.webContents.send('mini-mode-changed', isMiniMode);
  console.log('[Main] Mini mode:', isMiniMode);
});

ipcMain.handle('get-mini-mode', () => {
  return isMiniMode;
});

// Keyboard shortcuts for presentation control
ipcMain.on('send-key', (event, key: string) => {
  console.log(`[Main] Sending key: ${key}`);
  
  if (robot) {
    try {
      robot.keyTap(key);
      console.log(`[Key] Key ${key} sent with robotjs`);
    } catch (error: any) {
      console.error(`[Key] robotjs failed:`, error);
      sendKeyWithAppleScript(key);
    }
  } else {
    sendKeyWithAppleScript(key);
  }
});

function sendKeyWithAppleScript(key: string): void {
  const { exec } = require('child_process');
  
  // Map key names to AppleScript key codes
  const keyMap: { [key: string]: number } = {
    'left': 123,   // Left arrow
    'right': 124,  // Right arrow
    'up': 126,     // Up arrow
    'down': 125,   // Down arrow
    'space': 49,   // Space bar
    'escape': 53,  // Escape
  };
  
  const keyCode = keyMap[key];
  if (!keyCode) {
    console.error(`[Key] Unknown key: ${key}`);
    return;
  }
  
  const script = `tell application "System Events" to key code ${keyCode}`;
  
  exec(`osascript -e '${script}'`, (error: any, stdout: string, stderr: string) => {
    if (error) {
      console.error(`[Key] AppleScript error:`, error.message);
    } else {
      console.log(`[Key] Key ${key} sent with AppleScript`);
    }
  });
}

ipcMain.handle('get-mediapipe-path', () => {
  return path.join(__dirname, '../assets/mediapipe');
});

ipcMain.on('perform-click', (event, x: number, y: number) => {
  const roundedX = Math.round(x);
  const roundedY = Math.round(y);
  
  // Log to console
  console.log(`[Main] perform-click received: ${roundedX}, ${roundedY}`);
  
  // Check if we have accessibility permissions
  const hasAccess = process.platform === 'darwin' 
    ? systemPreferences.isTrustedAccessibilityClient(false)
    : true;
  
  if (!hasAccess) {
    console.log('[Click] No accessibility permission, using AppleScript');
    performClickWithAppleScript(roundedX, roundedY);
    return;
  }
  
  // Try robotjs if available and we have permissions
  if (robot && hasAccess) {
    try {
      robot.moveMouse(roundedX, roundedY);
      // Use a small delay then click
      setTimeout(() => {
        try {
          robot.mouseClick('left', false);
          console.log('[Click] Click performed with robotjs');
        } catch (clickError: any) {
          console.error('[Click] robotjs click failed, using AppleScript:', clickError);
          performClickWithAppleScript(roundedX, roundedY);
        }
      }, 30);
      return;
    } catch (error: any) {
      console.error(`[Click] robotjs failed: ${error.message || error}`);
      // Fall through to AppleScript
    }
  }
  
  // Use AppleScript as primary method (more reliable on macOS)
  console.log('[Click] Using AppleScript');
  performClickWithAppleScript(roundedX, roundedY);
});

function performClickWithAppleScript(x: number, y: number): void {
  const { exec } = require('child_process');
  
  // Use a simpler, more reliable AppleScript approach
  // Move mouse and click in one command
  const script = `tell application "System Events"
  set mouse position to {${x}, ${y}}
  delay 0.15
  click
end tell`;
  
  // Properly escape the script - use double quotes for the outer shell command
  const escapedScript = script.replace(/"/g, '\\"').replace(/\n/g, ' ');
  
  console.log(`[Click] Executing AppleScript click at ${x}, ${y}`);
  
  exec(`osascript -e "${escapedScript}"`, (error: any, stdout: string, stderr: string) => {
    if (error) {
      console.error(`[Click] ❌ AppleScript error: ${error.message || error}`);
      if (stderr) {
        console.error('[Click] stderr:', stderr);
        // Check if it's a permission error
        if (stderr.includes('not allowed') || stderr.includes('denied') || stderr.includes('accessibility')) {
          console.error('[Click] ⚠️  This looks like a permission error!');
          console.error('[Click] Make sure Terminal is enabled in:');
          console.error('[Click] System Preferences > Security & Privacy > Privacy > Accessibility');
          console.error('[Click] Then QUIT Terminal completely and restart the app');
        }
      }
      if (stdout) console.log('[Click] stdout:', stdout);
    } else {
      console.log('[Click] ✓ Click performed successfully with AppleScript');
      if (stdout) console.log('[Click] stdout:', stdout);
    }
  });
}

// Double-click handler
ipcMain.on('perform-double-click', (event, x: number, y: number) => {
  const roundedX = Math.round(x);
  const roundedY = Math.round(y);
  
  console.log(`[Main] perform-double-click received: ${roundedX}, ${roundedY}`);
  
  const hasAccess = process.platform === 'darwin' 
    ? systemPreferences.isTrustedAccessibilityClient(false)
    : true;
  
  if (robot && hasAccess) {
    try {
      robot.moveMouse(roundedX, roundedY);
      setTimeout(() => {
        try {
          robot.mouseClick('left', true); // true = double click
          console.log('[DoubleClick] Double-click performed with robotjs');
        } catch (clickError: any) {
          console.error('[DoubleClick] robotjs failed, using AppleScript:', clickError);
          performDoubleClickWithAppleScript(roundedX, roundedY);
        }
      }, 30);
      return;
    } catch (error: any) {
      console.error(`[DoubleClick] robotjs failed: ${error.message || error}`);
    }
  }
  
  performDoubleClickWithAppleScript(roundedX, roundedY);
});

function performDoubleClickWithAppleScript(x: number, y: number): void {
  const { exec } = require('child_process');
  
  const script = `tell application "System Events"
  set mouse position to {${x}, ${y}}
  delay 0.1
  click
  delay 0.1
  click
end tell`;
  
  const escapedScript = script.replace(/"/g, '\\"').replace(/\n/g, ' ');
  
  console.log(`[DoubleClick] Executing AppleScript double-click at ${x}, ${y}`);
  
  exec(`osascript -e "${escapedScript}"`, (error: any, stdout: string, stderr: string) => {
    if (error) {
      console.error(`[DoubleClick] ❌ AppleScript error: ${error.message || error}`);
      if (stderr) console.error('[DoubleClick] stderr:', stderr);
    } else {
      console.log('[DoubleClick] ✓ Double-click performed successfully');
    }
  });
}

// Right-click handler
ipcMain.on('perform-right-click', (event, x: number, y: number) => {
  const roundedX = Math.round(x);
  const roundedY = Math.round(y);
  
  console.log(`[Main] perform-right-click received: ${roundedX}, ${roundedY}`);
  
  const hasAccess = process.platform === 'darwin' 
    ? systemPreferences.isTrustedAccessibilityClient(false)
    : true;
  
  if (robot && hasAccess) {
    try {
      robot.moveMouse(roundedX, roundedY);
      setTimeout(() => {
        try {
          robot.mouseClick('right', false);
          console.log('[RightClick] Right-click performed with robotjs');
        } catch (clickError: any) {
          console.error('[RightClick] robotjs failed, using AppleScript:', clickError);
          performRightClickWithAppleScript(roundedX, roundedY);
        }
      }, 30);
      return;
    } catch (error: any) {
      console.error(`[RightClick] robotjs failed: ${error.message || error}`);
    }
  }
  
  performRightClickWithAppleScript(roundedX, roundedY);
});

function performRightClickWithAppleScript(x: number, y: number): void {
  const { exec } = require('child_process');
  
  // Right-click using control-click or secondary click
  const script = `tell application "System Events"
  set mouse position to {${x}, ${y}}
  delay 0.1
  click at {${x}, ${y}} using {control down}
end tell`;
  
  const escapedScript = script.replace(/"/g, '\\"').replace(/\n/g, ' ');
  
  console.log(`[RightClick] Executing AppleScript right-click at ${x}, ${y}`);
  
  exec(`osascript -e "${escapedScript}"`, (error: any, stdout: string, stderr: string) => {
    if (error) {
      console.error(`[RightClick] ❌ AppleScript error: ${error.message || error}`);
      if (stderr) console.error('[RightClick] stderr:', stderr);
      // Try alternative approach
      performRightClickAlternative(x, y);
    } else {
      console.log('[RightClick] ✓ Right-click performed successfully');
    }
  });
}

function performRightClickAlternative(x: number, y: number): void {
  const { exec } = require('child_process');
  
  // Alternative: use cliclick if available, or Python approach
  const pythonScript = `
import Quartz
from Quartz import CGEventCreateMouseEvent, CGEventPost, kCGEventRightMouseDown, kCGEventRightMouseUp, kCGMouseButtonRight, kCGHIDEventTap

def right_click(x, y):
    event_down = CGEventCreateMouseEvent(None, kCGEventRightMouseDown, (x, y), kCGMouseButtonRight)
    event_up = CGEventCreateMouseEvent(None, kCGEventRightMouseUp, (x, y), kCGMouseButtonRight)
    CGEventPost(kCGHIDEventTap, event_down)
    CGEventPost(kCGHIDEventTap, event_up)

right_click(${x}, ${y})
`;
  
  exec(`python3 -c "${pythonScript.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`, (error: any) => {
    if (error) {
      console.error('[RightClick] Python fallback also failed:', error.message);
    } else {
      console.log('[RightClick] ✓ Right-click performed with Python');
    }
  });
}

