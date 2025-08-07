import { useState, useEffect, useRef } from 'react';
import { DevtoolsPanel } from './DevtoolsPanel';
import type { OverlayRegistry } from '@react-overlay-manager/core';
import type { OverlayManagerCore } from '@react-overlay-manager/core';
import { useDevtoolsStore } from './useDevtoolsStore';

export function Devtools<TRegistry extends OverlayRegistry>({
  manager,
}: {
  manager: OverlayManagerCore<TRegistry>;
}) {
  const [isOpen, setIsOpen] = useState(() => {
    try {
      return sessionStorage.getItem('rom-devtools-open') === '1';
    } catch {
      return false;
    }
  });

  const overlayCount = useDevtoolsStore(manager, (s) => s.overlayStack.length);

  useEffect(() => {
    try {
      sessionStorage.setItem('rom-devtools-open', isOpen ? '1' : '0');
    } catch {}
  }, [isOpen]);

  useEffect(() => {
    const KEY_TOGGLE = 'O' as const;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key.toUpperCase() === KEY_TOGGLE
      ) {
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Optional: simple draggable floating button
  const btnRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let origRight = 20;
    let origBottom = 20;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const cs = window.getComputedStyle(btn);
      origRight = parseInt(cs.right || '20', 10);
      origBottom = parseInt(cs.bottom || '20', 10);
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      btn.style.right = `${Math.max(8, origRight - dx)}px`;
      btn.style.bottom = `${Math.max(8, origBottom - dy)}px`;
    };

    const onMouseUp = () => {
      isDragging = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    btn.addEventListener('mousedown', onMouseDown);
    return () => btn.removeEventListener('mousedown', onMouseDown);
  }, []);

  return (
    <>
      {!isOpen && (
        <button
          ref={btnRef}
          onClick={() => setIsOpen(true)}
          aria-label="Open Overlay Manager DevTools (Ctrl/⌘ + Shift + O)"
          title="Overlay Manager DevTools (Ctrl/⌘ + Shift + O)"
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 9999,
            padding: '8px 12px',
            backgroundColor: '#0d6efd',
            color: 'white',
            border: 'none',
            borderRadius: '18px',
            cursor: 'pointer',
            fontSize: '12px',
            fontFamily: 'monospace',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            userSelect: 'none',
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = '#0b5ed7')
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = '#0d6efd')
          }
        >
          <span>Overlays</span>
          <span
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              padding: '2px 6px',
              borderRadius: '12px',
              fontWeight: 700,
              minWidth: '20px',
              textAlign: 'center',
            }}
          >
            {overlayCount}
          </span>
        </button>
      )}
      {isOpen && (
        <DevtoolsPanel manager={manager} closePanel={() => setIsOpen(false)} />
      )}
    </>
  );
}
