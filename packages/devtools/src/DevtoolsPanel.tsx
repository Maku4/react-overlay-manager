import { useEffect, useMemo, useRef, useState } from 'react';
import { OverlayRow } from './OverlayRow';
import { getInstanceOverlayName } from '@react-overlay-manager/core';
import { OverlayDetails } from './OverlayDetails';
import { useDevtoolsStore } from './useDevtoolsStore';
import type {
  OverlayRegistry,
  OverlayId,
  OverlayInstance,
} from '@react-overlay-manager/core';
import type { OverlayManagerCore } from '@react-overlay-manager/core';

interface DevtoolsPanelProps<TRegistry extends OverlayRegistry> {
  manager: OverlayManagerCore<TRegistry>;
  closePanel: () => void;
}

type SortKey = 'recent' | 'visible' | 'name';

export function DevtoolsPanel<TRegistry extends OverlayRegistry>({
  manager,
  closePanel,
}: DevtoolsPanelProps<TRegistry>) {
  const STORAGE_SIZE_KEY = 'rom-devtools-panel-size';
  const STORAGE_POS_KEY = 'rom-devtools-panel-pos';
  const MIN_WIDTH = 320;
  const MAX_WIDTH = 800;
  const MIN_HEIGHT = 300;
  const MAX_HEIGHT = 800;
  const DEFAULT_WIDTH = 420;
  const DEFAULT_HEIGHT = 560;
  const [selectedId, setSelectedId] = useState<OverlayId | null>(() => {
    try {
      const v = sessionStorage.getItem('rom-devtools-selected');
      return v ? (v as OverlayId) : null;
    } catch {
      return null;
    }
  });
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('recent');

  const state = useDevtoolsStore(manager, (s) => s);

  // Draggable position persisted in sessionStorage
  const [position, setPosition] = useState<{ top: number; left: number }>(
    () => {
      try {
        const raw = sessionStorage.getItem(STORAGE_POS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { top?: number; left?: number };
          const top = Number.isFinite(parsed.top)
            ? Math.max(
                8,
                Math.min(
                  (typeof window !== 'undefined'
                    ? window.innerHeight
                    : DEFAULT_HEIGHT) - 48,
                  parsed.top as number
                )
              )
            : 20;
          const left = Number.isFinite(parsed.left)
            ? Math.max(
                8,
                Math.min(
                  (typeof window !== 'undefined'
                    ? window.innerWidth
                    : MAX_WIDTH) - MIN_WIDTH,
                  parsed.left as number
                )
              )
            : Math.max(
                8,
                (typeof window !== 'undefined'
                  ? window.innerWidth
                  : DEFAULT_WIDTH) -
                  DEFAULT_WIDTH -
                  20
              );
          return { top, left };
        }
      } catch {}
      return {
        top: 20,
        left: Math.max(
          8,
          (typeof window !== 'undefined' ? window.innerWidth : DEFAULT_WIDTH) -
            DEFAULT_WIDTH -
            20
        ),
      };
    }
  );

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_POS_KEY, JSON.stringify(position));
    } catch {}
  }, [position]);

  // Close panel via Escape for quick exit
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closePanel]);

  useEffect(() => {
    try {
      if (selectedId)
        sessionStorage.setItem('rom-devtools-selected', String(selectedId));
    } catch {}
  }, [selectedId]);

  const items = useMemo(() => {
    const list = state.overlayStack
      .map((id) => state.instances.get(id))
      .filter(Boolean) as OverlayInstance<unknown, unknown>[];

    const filtered = query.trim()
      ? list.filter((i) => {
          const name = getInstanceOverlayName(i);
          return (
            name.toLowerCase().includes(query.toLowerCase()) ||
            String(i.id).toLowerCase().includes(query.toLowerCase())
          );
        })
      : list;

    const sorted = [...filtered];
    switch (sort) {
      case 'visible':
        sorted.sort((a, b) => Number(b.visible) - Number(a.visible));
        break;
      case 'name':
        sorted.sort((a, b) => {
          const an = getInstanceOverlayName(a);
          const bn = getInstanceOverlayName(b);
          return an.localeCompare(bn);
        });
        break;
      case 'recent':
      default:
        // overlayStack order already represents stack order; keep it
        break;
    }
    return sorted;
  }, [state.overlayStack, state.instances, query, sort]);

  // Resizable panel (bottom bar + optional corner)
  const panelRef = useRef<HTMLDivElement | null>(null);
  const resizerRef = useRef<HTMLDivElement | null>(null);
  const cornerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const panel = panelRef.current;
    const resizer = resizerRef.current;
    const corner = cornerRef.current;
    if (!panel || !resizer) return;

    let startX = 0;
    let startY = 0;
    let startW = 0;
    let startH = 0;

    const onMouseDown = (e: MouseEvent) => {
      startX = e.clientX;
      startY = e.clientY;
      startW =
        panel.offsetWidth || parseInt(panel.style.width || '') || DEFAULT_WIDTH;
      startH =
        panel.offsetHeight ||
        parseInt(panel.style.height || '') ||
        DEFAULT_HEIGHT;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      e.preventDefault();
    };
    const onMouseMove = (e: MouseEvent) => {
      // Resize only height by default for better UX; width constrained but not actively resized
      const newW = Math.min(
        Math.max(MIN_WIDTH, startW - (e.clientX - startX)),
        MAX_WIDTH
      );
      const newH = Math.min(
        Math.max(MIN_HEIGHT, startH + (e.clientY - startY)),
        MAX_HEIGHT
      );
      panel.style.width = `${newW}px`;
      panel.style.height = `${newH}px`;
      try {
        sessionStorage.setItem(
          'rom-devtools-panel-size',
          JSON.stringify({ w: newW, h: newH })
        );
      } catch {}
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    resizer.addEventListener('mousedown', onMouseDown);

    // Corner handle for width+height resize
    let onCornerDown: ((e: MouseEvent) => void) | null = null;
    let onCornerMove: ((e: MouseEvent) => void) | null = null;
    let onCornerUp: (() => void) | null = null;
    if (corner) {
      onCornerDown = (e: MouseEvent) => {
        startX = e.clientX;
        startY = e.clientY;
        startW =
          panel.offsetWidth ||
          parseInt(panel.style.width || '') ||
          DEFAULT_WIDTH;
        startH =
          panel.offsetHeight ||
          parseInt(panel.style.height || '') ||
          DEFAULT_HEIGHT;
        document.addEventListener('mousemove', onCornerMove!);
        document.addEventListener('mouseup', onCornerUp!);
        e.preventDefault();
      };
      onCornerMove = (e: MouseEvent) => {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const newW = Math.min(Math.max(MIN_WIDTH, startW + dx), MAX_WIDTH);
        const newH = Math.min(Math.max(MIN_HEIGHT, startH + dy), MAX_HEIGHT);
        panel.style.width = `${newW}px`;
        panel.style.height = `${newH}px`;
        try {
          sessionStorage.setItem(
            STORAGE_SIZE_KEY,
            JSON.stringify({ w: newW, h: newH })
          );
        } catch {}
      };
      onCornerUp = () => {
        document.removeEventListener('mousemove', onCornerMove!);
        document.removeEventListener('mouseup', onCornerUp!);
      };
      corner.addEventListener('mousedown', onCornerDown);
    }

    return () => {
      resizer.removeEventListener('mousedown', onMouseDown);
      if (corner && onCornerDown)
        corner.removeEventListener('mousedown', onCornerDown);
    };
  }, []);

  // Draggable header to move panel around
  const headerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const header = headerRef.current;
    const panel = panelRef.current;
    if (!header || !panel) return;

    let dragging = false;
    let startX = 0;
    let startY = 0;
    let origTop = 0;
    let origLeft = 0;

    const onHeaderDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement | null;
      if (target && target.closest('button, a, input, select, textarea'))
        return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      origTop = panel.offsetTop;
      origLeft = panel.offsetLeft;
      document.addEventListener('mousemove', onHeaderMove);
      document.addEventListener('mouseup', onHeaderUp);
      e.preventDefault();
    };
    const onHeaderMove = (e: MouseEvent) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const nextTop = Math.max(
        8,
        Math.min(
          (typeof window !== 'undefined' ? window.innerHeight : MAX_HEIGHT) -
            48,
          origTop + dy
        )
      );
      const panelWidth = panel.offsetWidth || DEFAULT_WIDTH;
      const maxLeft =
        (typeof window !== 'undefined' ? window.innerWidth : MAX_WIDTH) -
        panelWidth -
        8;
      const nextLeft = Math.max(8, Math.min(maxLeft, origLeft + dx));
      setPosition({ top: nextTop, left: nextLeft });
    };
    const onHeaderUp = () => {
      dragging = false;
      document.removeEventListener('mousemove', onHeaderMove);
      document.removeEventListener('mouseup', onHeaderUp);
    };

    header.addEventListener('mousedown', onHeaderDown);
    return () => header.removeEventListener('mousedown', onHeaderDown);
  }, []);

  // Keep within viewport on resize
  useEffect(() => {
    const onResize = () => {
      const panel = panelRef.current;
      if (!panel) return;
      const panelWidth = panel.offsetWidth || DEFAULT_WIDTH;
      const maxLeft =
        (typeof window !== 'undefined' ? window.innerWidth : MAX_WIDTH) -
        panelWidth -
        8;
      const maxTop =
        (typeof window !== 'undefined' ? window.innerHeight : DEFAULT_HEIGHT) -
        48;
      setPosition((p) => ({
        top: Math.min(p.top, maxTop),
        left: Math.min(p.left, maxLeft),
      }));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div
      ref={panelRef}
      data-testid="rom-panel"
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: (() => {
          try {
            const raw = sessionStorage.getItem(STORAGE_SIZE_KEY);
            if (raw)
              return `${Math.max(320, Math.min(800, JSON.parse(raw).w))}px`;
          } catch {}
          return '420px';
        })(),
        height: (() => {
          try {
            const raw = sessionStorage.getItem(STORAGE_SIZE_KEY);
            if (raw)
              return `${Math.max(300, Math.min(800, JSON.parse(raw).h))}px`;
          } catch {}
          return '560px';
        })(),
        backgroundColor: '#ffffff',
        border: '1px solid #d0d7de',
        borderRadius: '12px',
        boxShadow: '0 16px 40px rgba(0,0,0,0.22)',
        zIndex: 10000,
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: '12px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backdropFilter: 'saturate(1.1)',
      }}
    >
      <header
        ref={headerRef}
        data-testid="rom-panel-header"
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid #e6ebf1',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background:
            'linear-gradient(180deg, rgba(246,248,250,1) 0%, rgba(240,243,247,1) 100%)',
          cursor: 'move',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2
            style={{
              margin: 0,
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: 0.2,
            }}
          >
            Overlay Manager DevTools
          </h2>
          <span
            title="Active overlays"
            style={{
              backgroundColor: '#e7f3ff',
              color: '#0969da',
              padding: '2px 6px',
              borderRadius: '999px',
              fontWeight: 700,
            }}
          >
            {state.overlayStack.length}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#57606a' }} title="Keyboard shortcut">
            Ctrl/⌘ + Shift + O
          </span>
          <button
            onClick={closePanel}
            aria-label="Close DevTools"
            style={{
              background: '#ffffff',
              border: '1px solid #d0d7de',
              fontSize: '14px',
              cursor: 'pointer',
              padding: '2px 8px',
              borderRadius: '8px',
              lineHeight: 1.2,
              transition:
                'background-color 120ms ease, border-color 120ms ease',
            }}
          >
            ×
          </button>
        </div>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: selectedId ? '1fr 1.4fr' : '1fr',
          minHeight: 0,
          flex: 1,
        }}
      >
        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            borderRight: selectedId ? '1px solid #eee' : 'none',
          }}
        >
          <div
            style={{
              padding: '8px',
              borderBottom: '1px solid #eee',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              position: 'sticky',
              top: 0,
              background: '#fff',
              zIndex: 1,
            }}
          >
            <input
              placeholder="Filter by name or ID…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid #d0d7de',
                outline: 'none',
              }}
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              title="Sort"
              style={{
                padding: '6px',
                borderRadius: '6px',
                border: '1px solid #d0d7de',
                background: '#fff',
              }}
            >
              <option value="recent">Recent</option>
              <option value="visible">Visible first</option>
              <option value="name">Name</option>
            </select>
          </div>

          <div style={{ padding: '8px', overflow: 'auto' }}>
            <h3
              style={{
                margin: '0 0 8px 0',
                fontSize: '12px',
                fontWeight: 700,
                color: '#24292f',
              }}
            >
              Active Overlays ({items.length})
            </h3>
            {items.length === 0 ? (
              <div
                style={{
                  color: '#57606a',
                  fontStyle: 'italic',
                  padding: '8px',
                  border: '1px dashed #d0d7de',
                  borderRadius: '6px',
                  background: '#fafbfc',
                }}
              >
                No overlays match the filter.
              </div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {items.map((instance) => (
                  <OverlayRow
                    key={instance.id}
                    instance={instance as OverlayInstance<unknown, unknown>}
                    isSelected={selectedId === instance.id}
                    onSelect={() => setSelectedId(instance.id)}
                  />
                ))}
              </ul>
            )}
          </div>
        </section>

        {selectedId && (
          <OverlayDetails manager={manager} instanceId={selectedId} />
        )}
      </div>

      <div
        ref={resizerRef}
        title="Resize"
        style={{
          height: '8px',
          cursor: 'ns-resize',
          borderTop: '1px solid #e6ebf1',
          background:
            'repeating-linear-gradient(90deg, #f6f8fa, #f6f8fa 6px, #eef1f4 6px, #eef1f4 12px)',
        }}
      />

      {/* Bottom-right corner resize handle */}
      <div
        ref={cornerRef}
        aria-hidden
        data-testid="rom-resize-corner"
        style={{
          position: 'absolute',
          width: '12px',
          height: '12px',
          right: '6px',
          bottom: '6px',
          cursor: 'nwse-resize',
          background:
            'linear-gradient(135deg, transparent 40%, #c9d1d9 40%, #c9d1d9 60%, transparent 60%)',
          borderRadius: '2px',
        }}
      />
    </div>
  );
}
