# @react-overlay-manager/devtools

A development panel for [`@react-overlay-manager/core`](https://github.com/Maku4/react-overlay-manager/blob/main/README.md). It lists open overlays, shows their props and lets you show, hide and close them.

## Installation

```bash
pnpm add -D @react-overlay-manager/devtools   # or npm i -D
```

## Usage

Render `OverlayManagerDevtools` next to `<OverlayManager>` and pass the same manager instance. With a different instance the panel stays empty.

```tsx
import {
  OverlayManager,
  createOverlayManager,
} from '@react-overlay-manager/core';
import { OverlayManagerDevtools } from '@react-overlay-manager/devtools';

const manager = createOverlayManager(yourRegistry);

function App() {
  return (
    <>
      {/* Your app content */}
      <OverlayManager manager={manager} />
      <OverlayManagerDevtools manager={manager} />
    </>
  );
}
```

`OverlayManagerDevtools` renders the panel only when `process.env.NODE_ENV` is `'development'` at import time. Otherwise it renders nothing. Vite, Next.js and webpack replace `process.env.NODE_ENV` in client builds. With a bundler that does not, define it yourself.

The panel shows overlay props, so it can display tokens or personal data that you pass to overlays. Keep it out of production builds.

## Server rendering

Render DevTools from a client component. In the Next.js App Router, that file must start with `'use client'`. The [SSR section of the core README](https://github.com/Maku4/react-overlay-manager/blob/main/README.md#ssr-and-nextjs) has a full provider example.

DevTools render the closed button on the server and on the first client render, so hydration matches. If the panel was open earlier in the same browser tab, it reopens after mount.

## Features

### Floating button

- Shows "Overlays" and the number of overlays in the stack. Click it to open the panel.
- Drag it to move it. It returns to the bottom-right corner each time the panel closes.

### Panel

- Drag the header to move the panel. Drag the bottom bar to change its height, or the bottom-right corner to change width and height.
- Filter overlays by name or ID. Sort them by Recent (stack order), Visible first or Name.
- Each row shows the overlay name, a Visible or Hidden badge and the ID.

### Details

Select a row to see the overlay's ID, visibility and props, with these actions:

- Close, which calls the overlay's `close()` with no result.
- Show or Hide.
- Copy the ID.
- Copy the props JSON. The copied text matches the props view, with or without "Pretty" formatting.

Props appear as JSON. Plain data is shown in full. Values that JSON cannot represent are shown as strings instead of breaking the view:

| Value                                   | Shown as                               |
| :-------------------------------------- | :------------------------------------- |
| The injected `manager` prop             | `"[OverlayManager]"`                   |
| BigInt `10n`                            | `"10n"`                                |
| A reference back to a containing object | `"[Circular]"`                         |
| Function `onSave`                       | `"[Function onSave]"`                  |
| React element `<div />`                 | `"[ReactElement <div>]"`               |
| DOM node                                | `"[HTMLDivElement div]"`               |
| `undefined`, `NaN`, `Infinity`, symbols | `"[undefined]"`, `"NaN"` and so on     |
| `Map`, `Set`                            | `{"[Map]": [...]}`, `{"[Set]": [...]}` |
| A getter or `toJSON()` that throws      | `"[Threw: message]"`                   |

### Keyboard

- `Ctrl/Cmd + Shift + O` opens or closes the panel. The shortcut is ignored while focus is in an `input`, a `textarea` or a `contenteditable` element.
- `Escape` closes the panel.
- `Tab` moves through the overlay rows. `Enter` or `Space` selects the focused row and keeps focus on it.

### Stored state

The panel keeps these values in `sessionStorage`, so they last for the current browser tab:

| Key                       | Value                     |
| :------------------------ | :------------------------ |
| `rom-devtools-open`       | Whether the panel is open |
| `rom-devtools-panel-pos`  | Panel position            |
| `rom-devtools-panel-size` | Panel size                |
| `rom-devtools-selected`   | Selected overlay ID       |

If `sessionStorage` is unavailable, the panel works without storing anything.

## Contributing

See [CONTRIBUTING.md](https://github.com/Maku4/react-overlay-manager/blob/main/CONTRIBUTING.md) in the repository root.
