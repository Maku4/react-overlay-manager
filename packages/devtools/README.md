# @react-overlay-manager/devtools

Developer tools for `react-overlay-manager` that provide real-time visualization and debugging capabilities for overlay management.

## Highlights

- **Real-time state**: Inspect the current overlay stack with live updates
- **Interactive debugging**: Close and Show/Hide overlays, copy ID and props JSON, and view basic metadata
- **Search & sort**: Filter by name/ID, sort by Recent, Visible first, or Name
- **Professional UX**: Draggable panel, resizable via bottom bar and bottom-right corner, position/size persist across sessions
- **Quick access**: Floating badge button (draggable) shows active count; keyboard shortcuts to toggle/close
- **Development-only**: Automatically a no-op in production builds

## Installation

```bash
pnpm add -D @react-overlay-manager/devtools
# or: npm i -D @react-overlay-manager/devtools
```

## Usage

Render the DevTools next to your `OverlayManager`. It automatically renders nothing in production.

```tsx
import { OverlayManagerDevtools } from '@react-overlay-manager/devtools';
import {
  OverlayManager,
  createOverlayManager,
} from '@react-overlay-manager/core';

const manager = createOverlayManager(yourRegistry);

function App() {
  return (
    <>
      {/* Your app content */}
      <OverlayManager manager={manager} />
      {/* DevTools renders only in development */}
      <OverlayManagerDevtools manager={manager} />
    </>
  );
}
```

## UI/UX Details

- **Floating button**
  - Bottom-right by default, shows label "Overlays" and a live count
  - Draggable; position persists while the app is running
  - Click to open the panel

- **Panel**
  - **Drag to move**: grab the header to reposition the window; position is clamped to the viewport and persisted
  - **Resize**: drag the bottom bar (height) or the bottom-right corner (width & height); size persists
  - **Search & sort**: filter by name or ID; sort by Recent, Visible first, or Name
  - **List**: shows each overlay with a visibility badge and ID
  - **Details**: when selected, see component name, ID, visibility, props (pretty/raw), and actions
    - Actions: Close; Show/Hide toggle; Copy ID; Copy props JSON

- **Keyboard shortcuts**
  - Toggle open/close: `Ctrl/⌘ + Shift + O`
  - Close panel: `Escape`
  - Shortcuts are ignored while typing in `input`, `textarea`, or `contenteditable` targets

## Development

- DevTools are exported as `OverlayManagerDevtools`, which is a pass-through to the real component in development and a `null` component in production
- Built with React + TypeScript and inline styles to avoid conflicts

## Building

```bash
cd packages/devtools
pnpm build
```

## Contributing

Contributions welcome! Please run the test suite in the monorepo root before submitting PRs.
