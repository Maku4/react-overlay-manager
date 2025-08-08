import { describe, it, expect } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { OverlayManager } from '../src/components/OverlayManager';
import { createOverlayManager } from '../src/createOverlayManager';
import { defineOverlay } from '../src/defineOverlay';
import type {
  OverlayComponent,
  InjectedOverlayProps,
  OverlayId,
} from '../src/types';

type P = { label?: string };

// Does NOT call onExitComplete itself; relies on container events
const EventDrivenOverlay: OverlayComponent<P, void> = defineOverlay<P, void>(
  ({ label = 'x', visible }: P & InjectedOverlayProps<void>) => {
    if (!visible) return <span data-testid="placeholder" />;
    return (
      <div
        role="dialog"
        aria-label={`dlg-${label}`}
        data-testid={`dlg-${label}`}
      />
    );
  }
);

describe('OverlayItem - transition/animation end removal', () => {
  it('removes on transitionend when exitDuration is null (manual completion)', async () => {
    const overlays = createOverlayManager({ dlg: EventDrivenOverlay });

    render(
      <div>
        <div id="portal-a" />
        <OverlayManager
          manager={overlays}
          portalTarget={document.getElementById('portal-a')}
          defaultExitDuration={null}
        />
      </div>
    );

    // Ensure target is set before opening (effect runs async on mount)
    const portalRoot = document.getElementById('portal-a');
    overlays.defaultPortalTarget = portalRoot as HTMLElement;

    // Open
    let id!: string;
    await act(async () => {
      const p: any = overlays.open('dlg', { label: 'A' });
      id = p.id;
    });

    const dlg = await screen.findByRole('dialog', { name: 'dlg-A' });
    const container = dlg.parentElement as HTMLElement;
    expect(container).toBeTruthy();

    // Close -> visible=false, isClosing=true
    await act(async () => {
      overlays.getInstance(id as unknown as OverlayId)!.close();
    });

    // Simulate CSS transition end on container to trigger onExitComplete
    await act(async () => {
      fireEvent.transitionEnd(container);
    });

    // Overlay should be removed
    expect(screen.queryByRole('dialog', { name: 'dlg-A' })).toBeNull();
  });

  it('also removes on animationend when exitDuration is null', async () => {
    const overlays = createOverlayManager({ dlg: EventDrivenOverlay });

    render(
      <div>
        <div id="portal-b" />
        <OverlayManager
          manager={overlays}
          portalTarget={document.getElementById('portal-b')}
          defaultExitDuration={null}
        />
      </div>
    );

    const portalRoot = document.getElementById('portal-b');
    overlays.defaultPortalTarget = portalRoot as HTMLElement;

    // Open
    let id!: string;
    await act(async () => {
      const p: any = overlays.open('dlg', { label: 'B' });
      id = p.id;
    });

    const dlg = await screen.findByRole('dialog', { name: 'dlg-B' });
    const container = dlg.parentElement as HTMLElement;

    // Close then simulate animationend
    await act(async () => {
      overlays.getInstance(id as unknown as OverlayId)!.close();
      fireEvent.animationEnd(container);
    });

    expect(screen.queryByRole('dialog', { name: 'dlg-B' })).toBeNull();
  });
});
