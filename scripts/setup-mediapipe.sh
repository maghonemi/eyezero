#!/bin/bash
# setup-mediapipe.sh
# Copy MediaPipe files from itutorv2 frontend to macOS app (optional)

# Get the script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
TARGET_DIR="$PROJECT_ROOT/assets/mediapipe"

# Check if MediaPipe files already exist
if [ -f "$TARGET_DIR/models/hand_landmarker.task" ] && [ -f "$TARGET_DIR/tasks-vision/index.js" ]; then
  echo "MediaPipe files already exist in $TARGET_DIR"
  echo "Skipping setup. If you need to update files, delete the assets/mediapipe directory first."
  exit 0
fi

# Try to find MediaPipe files from itutorv2 (if available)
SOURCE_DIR="/var/www/itutorv2/frontend/public/static/mediapipe"

if [ ! -d "$SOURCE_DIR" ]; then
  echo "Warning: MediaPipe source directory not found at $SOURCE_DIR"
  echo "If MediaPipe files are already in assets/mediapipe, you can skip this step."
  echo "Otherwise, please manually copy MediaPipe files to: $TARGET_DIR"
  exit 0
fi

echo "Setting up MediaPipe files for macOS..."
echo "Source: $SOURCE_DIR"
echo "Target: $TARGET_DIR"

# Create target directory
mkdir -p "$TARGET_DIR/tasks-vision/wasm"
mkdir -p "$TARGET_DIR/models"

# Copy MediaPipe library files
echo "Copying MediaPipe library files..."
if [ -f "$SOURCE_DIR/tasks-vision/index.js" ]; then
  cp "$SOURCE_DIR/tasks-vision/index.js" "$TARGET_DIR/tasks-vision/"
else
  echo "Warning: index.js not found in source"
fi

if [ -d "$SOURCE_DIR/tasks-vision/wasm" ]; then
  cp "$SOURCE_DIR/tasks-vision/wasm/"*.js "$TARGET_DIR/tasks-vision/wasm/" 2>/dev/null || true
  cp "$SOURCE_DIR/tasks-vision/wasm/"*.wasm "$TARGET_DIR/tasks-vision/wasm/" 2>/dev/null || true
else
  echo "Warning: WASM directory not found in source"
fi

# Copy MediaPipe model files
echo "Copying MediaPipe model files..."
if [ -f "$SOURCE_DIR/models/hand_landmarker.task" ]; then
  cp "$SOURCE_DIR/models/hand_landmarker.task" "$TARGET_DIR/models/"
else
  echo "Warning: hand_landmarker.task not found in source"
fi

echo "MediaPipe files setup complete!"
echo "Files in $TARGET_DIR:"
ls -lh "$TARGET_DIR" 2>/dev/null || echo "Directory not found"

