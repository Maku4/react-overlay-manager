import type { OverlayInstance } from '@react-overlay-manager/core';
import { getInstanceOverlayName } from '@react-overlay-manager/core';

interface OverlayRowProps {
  instance: OverlayInstance<unknown, unknown>;
  isSelected: boolean;
  onSelect: () => void;
}

export function OverlayRow({
  instance,
  isSelected,
  onSelect,
}: OverlayRowProps) {
  const componentName = getInstanceOverlayName(instance);

  const visibleBadge = (
    <span
      title={instance.visible ? 'Visible' : 'Hidden'}
      style={{
        padding: '2px 6px',
        borderRadius: '999px',
        fontSize: '10px',
        fontWeight: 700,
        color: instance.visible ? '#0a3622' : '#5a5a5a',
        backgroundColor: instance.visible ? '#d1f1e0' : '#eeeeee',
      }}
    >
      {instance.visible ? 'Visible' : 'Hidden'}
    </span>
  );

  return (
    <li
      onClick={onSelect}
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        gap: '8px',
        alignItems: 'center',
        padding: '8px 10px',
        cursor: 'pointer',
        backgroundColor: isSelected ? '#e7f3ff' : 'transparent',
        borderRadius: '6px',
        marginBottom: '6px',
        border: isSelected ? '1px solid #84c5f4' : '1px solid transparent',
        transition: 'background-color 120ms ease, border-color 120ms ease',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) e.currentTarget.style.backgroundColor = '#f6f8fa';
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <span
        style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor: instance.visible ? '#2da44e' : '#9e9e9e',
          boxShadow: instance.visible ? '0 0 0 2px #d1f1e0 inset' : 'none',
        }}
      />
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontWeight: isSelected ? 700 : 500,
            color: isSelected ? '#0969da' : '#24292f',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={String(componentName)}
        >
          {componentName}
        </div>
        <div
          style={{
            color: '#57606a',
            fontSize: '10px',
            fontFamily: 'monospace',
            marginTop: '2px',
          }}
          title={`ID: ${instance.id}`}
        >
          {visibleBadge} <span style={{ marginLeft: 6 }}>({instance.id})</span>
        </div>
      </div>
      <span
        style={{
          color: '#57606a',
          fontSize: '10px',
          userSelect: 'none',
        }}
      >
        ▶
      </span>
    </li>
  );
}
