# EyeZero Setup Guide

This guide will help you set up EyeZero for development or installation.

## Quick Start

### For End Users

1. Download the DMG from [Releases](https://github.com/maghonemi/eyezero/releases)
2. Open the DMG and drag EyeZero to Applications
3. Grant Camera and Accessibility permissions (see below)
4. Launch and enjoy!

### For Developers

```bash
git clone https://github.com/maghonemi/eyezero.git
cd eyezero
npm install
npm run build
npm run dev
```

## Permissions Setup

### Camera Permission

1. Open **System Preferences** → **Security & Privacy** → **Privacy** → **Camera**
2. Find **EyeZero** (or **Terminal** if running from source) in the list
3. Check the box to enable

### Accessibility Permission

**Required for mouse control and clicking:**

1. Open **System Preferences** → **Security & Privacy** → **Privacy** → **Accessibility**
2. Click the lock icon (bottom left) and enter your password
3. Find **EyeZero** (or **Terminal** if running from source)
4. Check the box to enable
5. **Restart the app** after granting permission

## MediaPipe Setup

MediaPipe files are included in the repository. If you need to update them:

1. MediaPipe files should be in `assets/mediapipe/`
2. The setup script (`scripts/setup-mediapipe.sh`) is optional
3. If files are missing, the app will show an error

## Building for Distribution

```bash
# Build the app
npm run build

# Create DMG installer
npm run package

# Output will be in release/ folder
```

## Troubleshooting

### "MediaPipe files not found"

- Ensure `assets/mediapipe/` directory exists
- Check that `hand_landmarker.task` is present
- Verify WASM files are in `assets/mediapipe/tasks-vision/wasm/`

### "Camera not working"

- Check System Preferences → Privacy → Camera
- Make sure no other app is using the camera
- Try restarting the app

### "Clicks not working"

- **Most common**: Accessibility permission not granted
- Go to System Preferences → Privacy → Accessibility
- Enable EyeZero/Terminal
- **Quit and restart** the app

### Build Errors

- Make sure Node.js 20+ is installed
- Run `npm install` to ensure dependencies are installed
- Check that TypeScript compiles: `npm run build:main && npm run build:renderer`

## Development Tips

- Use `npm run dev` for development with auto-rebuild
- Check console logs for debugging
- DevTools are disabled in production builds
- The app uses Electron's context isolation for security

## System Requirements

- macOS 10.12 (Sierra) or later
- Camera (built-in or external USB)
- Node.js 20+ (for development)
- 100MB free disk space
