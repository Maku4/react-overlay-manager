# Server-rendered apps

Read this when the app renders on the server, for example with the Next.js App Router.

A module-level manager on the server is shared by every request, so create one manager per provider instance with a `useState` initializer. `<OverlayManager>` and `<OverlayManagerDevtools>` use hooks and browser APIs, so render them from a client component.

```tsx
// app/overlays.tsx
'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import {
  createOverlayManager,
  OverlayManager,
} from '@react-overlay-manager/core';
import { OverlayManagerDevtools } from '@react-overlay-manager/devtools';
import { ConfirmDialog } from './ConfirmDialog';

const createAppOverlays = () =>
  createOverlayManager({ confirm: ConfirmDialog });
type AppOverlays = ReturnType<typeof createAppOverlays>;

const OverlaysContext = createContext<AppOverlays | null>(null);

export function useOverlays() {
  const manager = useContext(OverlaysContext);
  if (!manager) throw new Error('useOverlays needs <OverlaysProvider>');
  return manager;
}

export function OverlaysProvider({ children }: { children: ReactNode }) {
  const [manager] = useState(createAppOverlays);

  return (
    <OverlaysContext.Provider value={manager}>
      {children}
      <OverlayManager manager={manager} />
      <OverlayManagerDevtools manager={manager} />
    </OverlaysContext.Provider>
  );
}
```

Wrap the app in `<OverlaysProvider>` from a server layout, and open overlays from client components:

```tsx
// app/DeleteButton.tsx
'use client';

import { useOverlays } from './overlays';

export function DeleteButton() {
  const overlays = useOverlays();

  async function onClick() {
    const answer = await overlays.open('confirm', {
      message: 'Delete this item?',
    });
    if (answer === true) {
      // ...delete logic
    }
  }

  return <button onClick={onClick}>Delete</button>;
}
```

- Leave out `<OverlayManagerDevtools>` and its import if the app does not use DevTools.
- `<OverlayManager>` renders nothing on the server and on the first client render, so hydration matches. Overlays appear after mount.
- Do not read `document`, `window` or `sessionStorage` during render. Read them in an effect, for example to find a custom `portalTarget` element.
