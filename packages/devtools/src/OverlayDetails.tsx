import { useMemo, useState } from 'react';
import { useDevtoolsStore } from './useDevtoolsStore';
import { getInstanceOverlayName } from '@react-overlay-manager/core';
import type {
  OverlayRegistry,
  OverlayId,
  AnyOverlayInstance,
} from '@react-overlay-manager/core';
import { OverlayManagerCore } from '@react-overlay-manager/core';

interface OverlayDetailsProps<TRegistry extends OverlayRegistry> {
  manager: OverlayManagerCore<TRegistry>;
  instanceId: OverlayId;
}

export function OverlayDetails<TRegistry extends OverlayRegistry>({
  manager,
  instanceId,
}: OverlayDetailsProps<TRegistry>) {
  const instance = useDevtoolsStore(manager, (state) =>
    state.instances.get(instanceId)
  ) as AnyOverlayInstance<TRegistry> | undefined;

  const [prettyProps, setPrettyProps] = useState(true);

  const componentName = useMemo(() => {
    return instance ? getInstanceOverlayName(instance) : null;
  }, [instance]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // silently ignore
    }
  };

  if (!instance) {
    return (
      <section
        style={{
          padding: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#666',
        }}
      >
        Instance not found or has been removed.
      </section>
    );
  }

  return (
    <section
      style={{
        padding: '0',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
      }}
    >
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 1,
          background: '#fff',
          borderBottom: '1px solid #eee',
          padding: '10px 12px',
        }}
      >
        <h4
          style={{
            margin: 0,
            fontSize: '13px',
            fontWeight: 700,
            color: '#0969da',
          }}
          title={String(componentName)}
        >
          Details: {String(componentName)}
        </h4>
      </div>

      <div style={{ padding: '12px', overflowY: 'auto' }}>
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div>
              <strong>ID:</strong>
              <span
                style={{
                  fontFamily: 'monospace',
                  backgroundColor: '#f5f5f5',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  marginLeft: '6px',
                }}
              >
                {instance.id}
              </span>
            </div>
            <button
              onClick={() => copy(String(instance.id))}
              title="Copy ID"
              style={{
                padding: '4px 8px',
                border: '1px solid #d0d7de',
                borderRadius: '6px',
                background: '#fff',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              Copy
            </button>
          </div>
          <div style={{ marginTop: '6px' }}>
            <strong>Visible:</strong>
            <span
              style={{
                color: instance.visible ? '#2da44e' : '#f44336',
                marginLeft: '6px',
                fontWeight: 700,
              }}
            >
              {String(instance.visible)}
            </span>
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '6px',
            }}
          >
            <h5
              style={{
                margin: 0,
                fontSize: '12px',
                fontWeight: 700,
                color: '#333',
              }}
            >
              Props
            </h5>
            <div style={{ display: 'flex', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="checkbox"
                  checked={prettyProps}
                  onChange={() => setPrettyProps((v) => !v)}
                />
                Pretty
              </label>
              <button
                onClick={() =>
                  copy(
                    prettyProps
                      ? JSON.stringify(instance.props, null, 2)
                      : JSON.stringify(instance.props)
                  )
                }
                title="Copy props JSON"
                style={{
                  padding: '4px 8px',
                  border: '1px solid #d0d7de',
                  borderRadius: '6px',
                  background: '#fff',
                  cursor: 'pointer',
                  fontSize: '11px',
                }}
              >
                Copy JSON
              </button>
            </div>
          </div>
          <pre
            style={{
              backgroundColor: '#f8f9fa',
              padding: '8px',
              borderRadius: '6px',
              fontSize: '11px',
              overflow: 'auto',
              maxHeight: '220px',
              border: '1px solid #e9ecef',
              margin: 0,
            }}
          >
            {prettyProps
              ? JSON.stringify(instance.props, null, 2)
              : JSON.stringify(instance.props)}
          </pre>
        </div>

        <div>
          <h5
            style={{
              margin: '0 0 8px 0',
              fontSize: '12px',
              fontWeight: 700,
              color: '#333',
            }}
          >
            Actions
          </h5>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => instance.close()}
              style={{
                padding: '6px 12px',
                backgroundColor: '#ff9800',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              Close
            </button>
            <button
              onClick={() =>
                instance.visible ? instance.hide() : manager.show(instance.id)
              }
              style={{
                padding: '6px 12px',
                backgroundColor: instance.visible ? '#6c757d' : '#2da44e',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              {instance.visible ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
