# @react-overlay-manager/devtools

Developer tools for `react-overlay-manager` that provide real-time visualization and debugging capabilities for overlay management.

## Features

- **Real-time State Visualization**: See all active overlays and their current state
- **Interactive Debugging**: Close, remove, and inspect overlays directly from the DevTools
- **Props Inspection**: View and inspect the props passed to each overlay
- **Keyboard Shortcuts**: Use `Ctrl+Shift+O` to toggle the DevTools panel
- **Development Only**: Automatically disabled in production builds

## Installation

```bash
npm install @react-overlay-manager/devtools --save-dev
```

## Usage

Simply import and use the `OverlayManagerDevtools` component in your app:

```tsx
import { OverlayManagerDevtools } from '@react-overlay-manager/devtools';
import { createOverlayManager } from 'react-overlay-manager';

// Create your overlay manager
const manager = createOverlayManager(yourRegistry);

function App() {
  return (
    <div>
      {/* Your app content */}

      {/* DevTools - only renders in development */}
      <OverlayManagerDevtools manager={manager} />
    </div>
  );
}
```

## Features

### Floating Button

A small floating button appears in the bottom-right corner of your app, showing "Overlays" with the current count.

### DevTools Panel

Click the floating button or use `Ctrl+Shift+O` to open the DevTools panel, which includes:

- **Overlay List**: Shows all active overlays with their visibility status
- **Details Panel**: When an overlay is selected, shows:
  - Component name and ID
  - Visibility status
  - Props (formatted JSON)
  - Action buttons (Close, Remove)

### Keyboard Shortcuts

- `Ctrl+Shift+O`: Toggle DevTools panel

## Development

This package is designed to be used only in development mode. In production builds, the component renders `null` automatically.

## Building

```bash
cd packages/devtools
pnpm build
```

## Contributing

The DevTools are built using React and TypeScript, with inline styles to avoid conflicts with your application's styling.
