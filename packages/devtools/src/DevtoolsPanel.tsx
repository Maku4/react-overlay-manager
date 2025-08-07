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

  // Resizable panel
  const panelRef = useRef<HTMLDivElement | null>(null);
  const resizerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const panel = panelRef.current;
    const resizer = resizerRef.current;
    if (!panel || !resizer) return;

    let startX = 0;
    let startY = 0;
    let startW = 0;
    let startH = 0;

    const onMouseDown = (e: MouseEvent) => {
      startX = e.clientX;
      startY = e.clientY;
      startW = panel.offsetWidth;
      startH = panel.offsetHeight;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      e.preventDefault();
    };
    const onMouseMove = (e: MouseEvent) => {
      const newW = Math.min(Math.max(320, startW - (e.clientX - startX)), 800);
      const newH = Math.min(Math.max(300, startH + (e.clientY - startY)), 800);
      panel.style.width = `${newW}px`;
      panel.style.height = `${newH}px`;
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    resizer.addEventListener('mousedown', onMouseDown);
    return () => resizer.removeEventListener('mousedown', onMouseDown);
  }, []);

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        width: '420px',
        height: '560px',
        backgroundColor: '#fff',
        border: '1px solid #d0d7de',
        borderRadius: '10px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        zIndex: 10000,
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: '12px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <header
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f6f8fa',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2 style={{ margin: 0, fontSize: '13px', fontWeight: 700 }}>
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
              background: 'none',
              border: '1px solid #d0d7de',
              fontSize: '14px',
              cursor: 'pointer',
              padding: '2px 8px',
              borderRadius: '6px',
              lineHeight: 1.2,
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
          borderTop: '1px solid #eee',
          background:
            'repeating-linear-gradient(90deg, #f6f8fa, #f6f8fa 6px, #eef1f4 6px, #eef1f4 12px)',
        }}
      />
    </div>
  );
}
