# Contributing to EyeZero

Thank you for your interest in contributing to EyeZero! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/maghonemi/eyezero/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - System information (macOS version, etc.)
   - Screenshots if applicable

### Suggesting Features

1. Check existing feature requests
2. Create a new issue with:
   - Clear description of the feature
   - Use case and motivation
   - Potential implementation approach (if you have ideas)

### Pull Requests

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/your-feature-name`)
3. **Make your changes**
   - Follow the existing code style
   - Add comments for complex logic
   - Update documentation if needed
4. **Test your changes**
   - Run `npm run build` to ensure it compiles
   - Test the functionality
5. **Commit your changes** (`git commit -m 'Add feature: description'`)
6. **Push to your fork** (`git push origin feature/your-feature-name`)
7. **Open a Pull Request**

## Development Setup

```bash
# Clone your fork
git clone https://github.com/maghonemi/eyezero.git
cd eyezero

# Install dependencies
npm install

# Build the project
npm run build

# Run in development
npm run dev
```

## Code Style

- Use TypeScript for type safety
- Follow existing code formatting
- Use meaningful variable and function names
- Add JSDoc comments for public functions
- Keep functions focused and small

## Project Structure

- `src/main/` - Electron main process (system-level code)
- `src/renderer/` - Renderer process (UI and gesture logic)
- `assets/` - Static assets (icons, MediaPipe files)
- `scripts/` - Build and setup scripts

## Testing

Before submitting a PR:

- [ ] Code compiles without errors (`npm run build`)
- [ ] App runs in development mode (`npm run dev`)
- [ ] New features work as expected
- [ ] No console errors
- [ ] Documentation updated if needed

## Commit Messages

Use clear, descriptive commit messages:

- `Add feature: gesture sensitivity settings`
- `Fix: cursor disappearing on window close`
- `Update: improve error messages for camera access`

## Questions?

Feel free to open an issue for questions or reach out to maintainers.

Thank you for contributing! 🎉

