// app.ts
// Main renderer process - handles UI and gesture tracking

import { GestureController } from './gestureController.js';

const app = document.getElementById('app');
if (app) {
  new GestureController(app);
}

