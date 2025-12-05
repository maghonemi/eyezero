// preload.ts
// Preload script for secure IPC communication

import { contextBridge, ipcRenderer } from 'electron';
import * as path from 'path';

contextBridge.exposeInMainWorld('electronAPI', {
  updateCursor: (x: number, y: number, state: string) => {
    ipcRenderer.send('update-cursor', x, y, state);
  },
  toggleCursorVisibility: (visible: boolean) => {
    ipcRenderer.send('toggle-cursor-visibility', visible);
  },
  onCursorUpdate: (callback: (x: number, y: number, state: string) => void) => {
    ipcRenderer.on('cursor-update', (event, x, y, state) => callback(x, y, state));
  },
  onCursorVisibility: (callback: (visible: boolean) => void) => {
    ipcRenderer.on('cursor-visibility', (event, visible) => callback(visible));
  },
  closeWindow: () => {
    ipcRenderer.send('window-close');
  },
  minimizeWindow: () => {
    ipcRenderer.send('window-minimize');
  },
  toggleMiniMode: () => {
    ipcRenderer.send('toggle-mini-mode');
  },
  getMiniMode: () => {
    return ipcRenderer.invoke('get-mini-mode');
  },
  onMiniModeChanged: (callback: (isMini: boolean) => void) => {
    ipcRenderer.on('mini-mode-changed', (event, isMini) => callback(isMini));
  },
  getMediaPipePath: () => {
    return ipcRenderer.invoke('get-mediapipe-path');
  },
  performClick: (x: number, y: number) => {
    console.log('[Preload] Sending perform-click IPC:', x, y);
    ipcRenderer.send('perform-click', x, y);
  },
  performDoubleClick: (x: number, y: number) => {
    console.log('[Preload] Sending perform-double-click IPC:', x, y);
    ipcRenderer.send('perform-double-click', x, y);
  },
  performRightClick: (x: number, y: number) => {
    console.log('[Preload] Sending perform-right-click IPC:', x, y);
    ipcRenderer.send('perform-right-click', x, y);
  },
  sendKey: (key: string) => {
    console.log('[Preload] Sending key:', key);
    ipcRenderer.send('send-key', key);
  },
  requestCameraPermission: async () => {
    return ipcRenderer.invoke('request-camera-permission');
  },
  onPermissionAlert: (callback: (message: string) => void) => {
    ipcRenderer.on('show-permission-alert', (event, message) => callback(message));
  }
});
