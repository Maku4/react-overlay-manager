import { useState } from 'react';
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
  const [focusVisible, setFocusVisible] = useState(false);

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
      // Clicks on the button bubble here, so Enter and Space select via the same handler.
      onClick={onSelect}
      style={{
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
      <button
        type="button"
        aria-label={`${componentName}, ID ${instance.id}, ${
          instance.visible ? 'visible' : 'hidden'
        }`}
        aria-current={isSelected ? 'true' : undefined}
        onFocus={(e) => {
          let visible = true;
          try {
            visible = e.currentTarget.matches(':focus-visible');
          } catch {}
          setFocusVisible(visible);
        }}
        onBlur={() => setFocusVisible(false)}
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          gap: '8px',
          alignItems: 'center',
          width: '100%',
          padding: '8px 10px',
          margin: 0,
          border: 'none',
          borderRadius: '6px',
          background: 'transparent',
          color: 'inherit',
          font: 'inherit',
          textAlign: 'left',
          cursor: 'pointer',
          outline: focusVisible ? '2px solid #0969da' : 'none',
          outlineOffset: '2px',
        }}
      >
        <span
          aria-hidden
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: instance.visible ? '#2da44e' : '#9e9e9e',
            boxShadow: instance.visible ? '0 0 0 2px #d1f1e0 inset' : 'none',
          }}
        />
        <span style={{ display: 'block', minWidth: 0 }}>
          <span
            style={{
              display: 'block',
              fontWeight: isSelected ? 700 : 500,
              color: isSelected ? '#0969da' : '#24292f',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={String(componentName)}
          >
            {componentName}
          </span>
          <span
            style={{
              display: 'block',
              color: '#57606a',
              fontSize: '10px',
              fontFamily: 'monospace',
              marginTop: '2px',
            }}
            title={`ID: ${instance.id}`}
          >
            {visibleBadge}{' '}
            <span style={{ marginLeft: 6 }}>({instance.id})</span>
          </span>
        </span>
        <span
          aria-hidden
          style={{
            color: '#57606a',
            fontSize: '10px',
            userSelect: 'none',
          }}
        >
          ▶
        </span>
      </button>
    </li>
  );
}
