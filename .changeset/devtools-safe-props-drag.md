---
'@react-overlay-manager/devtools': patch
---

The details view no longer crashes on props that JSON cannot serialize. BigInt values, circular references, functions, React elements and throwing getters show as readable placeholders, and the injected `manager` prop shows as `[OverlayManager]` instead of being expanded. Ordinary JSON data is shown in full. Copy JSON copies the same text the view shows.

The floating button can be dragged again after the panel is closed, including when the panel was restored open from session storage.
