'use client';
import { createElement, CSSProperties, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { useOverlayStore } from '../hooks/useOverlayStore';
import { OverlayManagerCore } from '../manager/OverlayManagerCore';
import { OverlayId, OverlayRegistry } from '../types';

function OverlayItemComponent<TRegistry extends OverlayRegistry>({
  id,
  manager,
  zIndex,
}: {
  id: OverlayId;
  manager: OverlayManagerCore<TRegistry>;
  zIndex: number;
}) {
  const instance = useOverlayStore(manager, (state) => state.instances.get(id));

  const overlayContent = useMemo(() => {
    if (!instance) {
      return null;
    }
    const {
      visible,
      component: Component,
      props,
      hide,
      close,
      onExitComplete,
    } = instance;

    const componentProps = {
      ...props,
      id,
      visible,
      hide,
      close,
      onExitComplete,
    };
    return createElement(Component, componentProps);
  }, [instance, id]);

  if (!instance || !instance.portalTarget) {
    return null;
  }

  const { visible, isClosing, onExitComplete } = instance;

  const containerStyle: CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: zIndex,
    pointerEvents: visible ? 'auto' : 'none',
  };

  const overlayElement = (
    <div
      style={containerStyle}
      aria-hidden={!visible}
      onTransitionEnd={() =>
        !visible && isClosing ? onExitComplete() : undefined
      }
      onAnimationEnd={() =>
        !visible && isClosing ? onExitComplete() : undefined
      }
    >
      {overlayContent}
    </div>
  );

  return createPortal(overlayElement, instance.portalTarget, id);
}

export const OverlayItem = memo(
  OverlayItemComponent
) as typeof OverlayItemComponent;
