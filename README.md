# EyeZero

Control your Mac with hand gestures via camera. EyeZero uses MediaPipe hand tracking AI to translate your hand movements into precise mouse control, clicks, and presentation navigation.

![EyeZero](https://img.shields.io/badge/platform-macOS-lightgrey)
![License](https://img.shields.io/badge/license-MIT-blue)

## ✨ Features

### 🖱️ Mouse Control
- **👆 Move Cursor** - Point with your index finger to move the mouse
- **🤏 Left Click** - Pinch index finger + thumb together to click
- **🤏🤏 Double-Click** - Quick double pinch for double-click
- **✌️ Right-Click** - Pinch middle finger + thumb for context menu
- **✊ Scroll** - Pinch and drag up/down to scroll

### 🎯 Presentation Mode
Perfect for hands-free slide navigation!
- **👋 Swipe Left** → Next slide (sends Right arrow key)
- **👋 Swipe Right** → Previous slide (sends Left arrow key)
- Works with PowerPoint, Keynote, Google Slides, and more

### 🖥️ Mini Widget Mode
- **⊡ Compact Window** - Shrink to a tiny 130×110px widget
- Perfect for full-screen presentations
- Shows camera feed and status only

### 👁️ Visual Feedback
- **🖐️ Hand Skeleton Overlay** - See real-time hand tracking visualization
- **Color-Coded Fingertips**:
  - 🟢 Green = Index finger (left click)
  - 🟠 Orange = Middle finger (right click)
  - 🟡 Yellow = Thumb
- **Gesture Indicator** - Shows current detected action (Moving/Click/Right-Click)
- **Cursor State Colors** - Cursor changes color based on gesture

### 🎨 Advanced Features
- **Real-time Tracking** - Smooth, responsive cursor movement using MediaPipe
- **Gesture Stability** - 4-frame filtering prevents false positives
- **Improved Accuracy** - Stricter thresholds and exclusion checks
- **Privacy First** - All processing happens locally, no data sent to servers

## 📋 Requirements

- macOS 10.12 or later
- Camera (built-in or external)
- **Camera permissions** (for hand tracking)
- **Accessibility permissions** (for mouse control and clicking)

## 📥 Installation

### Option 1: Download Pre-built DMG

1. Download the latest DMG from the [Releases](https://github.com/maghonemi/eyezero/releases) page
   - **Apple Silicon** (M1/M2/M3): `EyeZero-1.0.0-arm64.dmg`
   - **Intel**: `EyeZero-1.0.0.dmg`
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

## ⚙️ Setup

### 1. Grant Camera Permission

1. Open **System Preferences** → **Security & Privacy** → **Privacy** → **Camera**
2. Check the box next to **EyeZero** (or **Terminal** if running from source)
3. Restart the app if needed

### 2. Grant Accessibility Permission

**Required for mouse control and clicking:**

1. Open **System Preferences** → **Security & Privacy** → **Privacy** → **Accessibility**
2. Click the lock icon and enter your password
3. Check the box next to **EyeZero** (or **Terminal** if running from source)
4. **Quit and restart** the app after granting permission

## 🚀 Usage

1. **Launch EyeZero** from Applications
2. **Click "Start Control"** to begin tracking
3. **Position yourself** so your hand is visible in the camera view (1-2 feet away)
4. **Move your hand** to control the cursor
5. **Use gestures** to click, right-click, scroll, or navigate slides
6. **Click "Stop Control"** when done

### 🖐️ Gestures

| Gesture | Action |
|---------|--------|
| **👆 Point** with index finger | Move cursor |
| **🤏 Pinch** index + thumb | Left click |
| **🤏🤏 Double pinch** quickly | Double-click |
| **✌️ Pinch** middle + thumb | Right-click |
| **✊ Pinch + drag** up/down | Scroll |
| **👋 Swipe** left/right | Next/Prev slide (in Slides Mode) |

### 🎯 Presentation Mode

1. **Enable "Slides Mode"** toggle in the app
2. **Swipe your hand left** → Next slide
3. **Swipe your hand right** → Previous slide
4. Works with any presentation app that responds to arrow keys

### ⊡ Mini Widget Mode

1. Click the **⊡** button to shrink to mini mode
2. Perfect for full-screen presentations
3. Click **⊞** to expand back to full size

### 💡 Tips for Best Results

- **Position**: Keep your hand **1-2 feet** from the camera
- **Lighting**: Use in **good lighting** for better tracking
- **Pinching**: Keep other fingers **extended** when pinching
- **Watch the overlay**: The hand skeleton shows what's being detected
- **Gesture indicator**: Top-right shows current detected action

## 🛠️ Development

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
│   │   ├── main.ts     # Window management, IPC handlers, mouse control
│   │   └── preload.ts  # Secure IPC bridge
│   └── renderer/       # Renderer process (UI)
│       ├── app.ts      # Main app entry
│       ├── gestureController.ts  # Main controller, UI
│       ├── handTracker.ts         # MediaPipe integration
│       ├── cursorController.ts   # Cursor movement logic
│       └── clickHandler.ts       # Click, swipe, gesture detection
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

## 🐛 Troubleshooting

### Camera Not Working

- Check camera permissions in System Preferences
- Make sure no other app is using the camera
- Try restarting the app
- Verify EyeZero appears in Privacy → Camera

### Clicks Not Working

- **Most common issue**: Accessibility permission not granted
- Go to System Preferences → Security & Privacy → Privacy → Accessibility
- Make sure EyeZero (or Terminal) is checked
- **Quit and restart** the app after granting permission

### Right-Click Triggering When Not Intended

- Make sure to **extend your index finger** when doing right-click (middle + thumb)
- The app uses gesture stability filtering to prevent false positives
- Watch the hand skeleton overlay to see what's being detected

### Cursor Not Moving

- Check that your hand is visible in the camera view
- Ensure good lighting
- Try adjusting your position relative to the camera
- Make sure "Start Control" is active

### Swipe Gestures Not Working

- Make sure **Slides Mode** is enabled (toggle switch)
- Swipe must be horizontal (left/right), not vertical
- Try a more pronounced swipe motion

### App Won't Start

- Check console for error messages
- Verify all dependencies are installed: `npm install`
- Make sure MediaPipe files are in `assets/mediapipe/`

## 🏗️ Technology Stack

- **Electron** - Desktop app framework
- **TypeScript** - Type-safe JavaScript
- **MediaPipe** - Hand tracking ML model (Google)
- **robotjs** - System mouse control (with AppleScript fallback)
- **TensorFlow.js** - ML runtime

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [MediaPipe](https://mediapipe.dev/) for hand tracking AI
- [Electron](https://www.electronjs.org/) for the desktop framework
- [robotjs](https://github.com/octalmage/robotjs) for system control

## 💬 Support

- 🐛 [Report a Bug](https://github.com/maghonemi/eyezero/issues)
- 💡 [Request a Feature](https://github.com/maghonemi/eyezero/issues)
- 📖 [Documentation](https://github.com/maghonemi/eyezero/wiki)

## 🗺️ Roadmap

- [ ] Customizable sensitivity settings
- [ ] Multiple camera support
- [ ] Gesture recording and playback
- [ ] Custom gesture shortcuts
- [ ] Windows and Linux support
- [ ] Calibration wizard for optimal positioning

---

**EyeZero** - Made with ❤️ by [Mahmoud Ghonemi](https://github.com/maghonemi) at [Intrazero](https://intrazero.com)

For accessible computing and gesture-based interaction.
