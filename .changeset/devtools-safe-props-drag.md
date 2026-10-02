---
'@react-overlay-manager/devtools': patch
---

The details view no longer crashes on props that JSON cannot serialize. BigInt values, circular references, functions, React elements and throwing getters show as readable placeholders, and the injected `manager` prop shows as `[OverlayManager]` instead of being expanded. Ordinary JSON data is shown in full. Copy JSON copies the same text the view shows.

The floating button can be dragged again after the panel is closed, including when the panel was restored open from session storage. Releasing the button after a drag no longer opens the panel. A plain click still does.

Overlay rows are now buttons. Tab reaches each row, Enter or Space selects it, the selected row is marked with `aria-current`, and keyboard focus shows a visible outline.

Server-rendered apps no longer hit a hydration mismatch when the panel was left open. DevTools renders closed on the server and on the first client render, then reopens the panel from session storage after mount.

The Show and Close actions are disabled for an overlay that is already closing, because its promise has resolved and it is waiting for removal. Show still works for a hidden overlay that is not closing.
