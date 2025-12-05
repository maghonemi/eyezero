# EyeZero

Control your Mac with hand gestures via camera. EyeZero uses MediaPipe hand tracking to translate your hand movements into mouse control and clicks.

![EyeZero](https://img.shields.io/badge/platform-macOS-lightgrey)
![License](https://img.shields.io/badge/license-MIT-blue)

## Features

- 🖐️ **Hand Gesture Control** - Move your hand to control the mouse cursor
- 👆 **Pinch to Click** - Pinch your thumb and index finger together to click
- 🎯 **Real-time Tracking** - Smooth, responsive cursor movement using MediaPipe
- 🎨 **Visual Feedback** - See your cursor position with an on-screen indicator
- 🔒 **Privacy First** - All processing happens locally, no data sent to servers

## Requirements

- macOS 10.12 or later
- Camera (built-in or external)
- Accessibility permissions (for mouse control)
- Camera permissions

## Installation

### Option 1: Download Pre-built DMG

1. Download the latest DMG from the [Releases](https://github.com/maghonemi/eyezero/releases) page
2. Open the DMG file
3. Drag `EyeZero.app` to your Applications folder
4. Open EyeZero from Applications (you may need to right-click and select "Open" the first time)

### Option 2: Build from Source

```bash
# Clone the repository
git clone https://github.com/maghonemi/eyezero.git
cd eyezero

# Install dependencies
npm install

# Build the app
npm run build

# Run in development mode
npm run dev

# Package for distribution
npm run package
```

## Setup

### 1. Grant Camera Permission

1. Open **System Preferences** → **Security & Privacy** → **Privacy** → **Camera**
2. Check the box next to **EyeZero** (or **Terminal** if running from source)

### 2. Grant Accessibility Permission

**Required for mouse control and clicking:**

1. Open **System Preferences** → **Security & Privacy** → **Privacy** → **Accessibility**
2. Click the lock icon and enter your password
3. Check the box next to **EyeZero** (or **Terminal** if running from source)
4. Restart the app after granting permission

## Usage

1. **Launch EyeZero** from Applications
2. **Click "Start Control"** to begin
3. **Position yourself** so your hand is visible in the camera view
4. **Move your hand** to control the cursor
5. **Pinch** (thumb + index finger together) to click
6. **Click "Stop Control"** when done

### Gestures

- **Hand Movement** → Moves the mouse cursor
- **Pinch** (thumb + index finger) → Click
- **Pinch + Drag** → Drag and scroll

## Development

### Prerequisites

- Node.js 20+ 
- npm or yarn
- TypeScript
- Electron 28+

### Project Structure

```
eyezero/
├── src/
│   ├── main/           # Electron main process
│   │   ├── main.ts     # Window management, IPC handlers
│   │   └── preload.ts  # Secure IPC bridge
│   └── renderer/       # Renderer process (UI)
│       ├── app.ts      # Main app entry
│       ├── gestureController.ts  # Main controller
│       ├── handTracker.ts         # MediaPipe integration
│       ├── cursorController.ts   # Cursor movement logic
│       └── clickHandler.ts       # Click detection
├── assets/
│   ├── icons/          # App icons
│   └── mediapipe/      # MediaPipe models and WASM files
├── scripts/
│   └── setup-mediapipe.sh  # MediaPipe setup script
└── dist/               # Compiled output
```

### Building

```bash
# Build TypeScript
npm run build

# Build main process only
npm run build:main

# Build renderer process only
npm run build:renderer

# Package for macOS
npm run package
```

### Scripts

- `npm run dev` - Build and run in development mode
- `npm run build` - Build all TypeScript files
- `npm run package` - Create macOS DMG installer
- `npm run setup` - Setup MediaPipe files (optional)

## Troubleshooting

### Camera Not Working

- Check camera permissions in System Preferences
- Make sure no other app is using the camera
- Try restarting the app

### Clicks Not Working

- **Most common issue**: Accessibility permission not granted
- Go to System Preferences → Security & Privacy → Privacy → Accessibility
- Make sure EyeZero (or Terminal) is checked
- **Quit and restart** the app after granting permission

### Cursor Not Moving

- Check that your hand is visible in the camera view
- Ensure good lighting
- Try adjusting your position relative to the camera

### App Won't Start

- Check console for error messages
- Verify all dependencies are installed: `npm install`
- Make sure MediaPipe files are in `assets/mediapipe/`

## Technology Stack

- **Electron** - Desktop app framework
- **TypeScript** - Type-safe JavaScript
- **MediaPipe** - Hand tracking ML model
- **robotjs** - System mouse control (with AppleScript fallback)

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [MediaPipe](https://mediapipe.dev/) for hand tracking
- [Electron](https://www.electronjs.org/) for the desktop framework
- [robotjs](https://github.com/octalmage/robotjs) for system control

## Support

- 🐛 [Report a Bug](https://github.com/maghonemi/eyezero/issues)
- 💡 [Request a Feature](https://github.com/maghonemi/eyezero/issues)
- 📖 [Documentation](https://github.com/maghonemi/eyezero/wiki)

## Roadmap

- [ ] Support for multiple gestures (scroll, right-click, etc.)
- [ ] Customizable sensitivity settings
- [ ] Multiple camera support
- [ ] Gesture recording and playback
- [ ] Windows and Linux support

---

**EyeZero** - Made with ❤️ by [Mahmoud Ghonemi](https://github.com/maghonemi) at [Intrazero](https://intrazero.com)

For accessible computing and gesture-based interaction.
