import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { OverlayManager } from '../src/components/OverlayManager';
import { createOverlayManager } from '../src/createOverlayManager';
import { defineOverlay } from '../src/defineOverlay';
import type {
  OverlayComponent,
  InjectedOverlayProps,
  OverlayId,
} from '../src/types';

type P = { label?: string };
const TestOverlay: OverlayComponent<P, void> = defineOverlay<P, void>(
  ({ label = 'x', visible }: P & InjectedOverlayProps<void>) => {
    if (!visible) return <span data-testid="placeholder" />;
    return <div role="dialog" aria-label={`dlg-${label}`} />;
  }
);

describe('OverlayManager - props integration', () => {
  it('zIndexBase defaults to 100 and increments', async () => {
    const overlays = createOverlayManager({ dlg: TestOverlay });

    render(
      <div>
        <div id="portal-z" />
        <OverlayManager
          manager={overlays}
          portalTarget={document.getElementById('portal-z')}
          stackingBehavior="stack"
        />
      </div>
    );

    await act(async () => {
      overlays.defaultPortalTarget = document.getElementById('portal-z');
      overlays.open('dlg', { label: 'A' });
      overlays.open('dlg', { label: 'B' });
    });

    const dialogs = await screen.findAllByRole('dialog');
    const c1 = dialogs[0].parentElement as HTMLElement;
    const c2 = dialogs[1].parentElement as HTMLElement;
    expect(c1.style.zIndex).toBe('100');
    expect(c2.style.zIndex).toBe('101');
  });

  it('portalTarget prop affects subsequent opens at runtime', async () => {
    const overlays = createOverlayManager({ dlg: TestOverlay });

    const rootA = document.createElement('div');
    rootA.id = 'rootA';
    document.body.appendChild(rootA);
    const rootB = document.createElement('div');
    rootB.id = 'rootB';
    document.body.appendChild(rootB);

    const { rerender } = render(
      <OverlayManager
        manager={overlays}
        portalTarget={rootA}
        stackingBehavior="stack"
      />
    );

    let id1!: string;
    await act(async () => {
      // Ensure manager has same target before the effect runs
      overlays.defaultPortalTarget = rootA;
      const p1: any = overlays.open('dlg', { label: 'A' });
      id1 = p1.id;
    });

    // Switch portal target at runtime
    rerender(
      <OverlayManager
        manager={overlays}
        portalTarget={rootB}
        stackingBehavior="stack"
      />
    );

    let id2!: string;
    await act(async () => {
      // Allow prop effect to propagate
      await Promise.resolve();
      const p2: any = overlays.open('dlg', { label: 'B' });
      id2 = p2.id;
    });

    // Ensure both dialogs are present
    await screen.findByRole('dialog', { name: 'dlg-A' });
    await screen.findByRole('dialog', { name: 'dlg-B' });

    // First dialog is in rootA
    expect(
      rootA.querySelector('[role="dialog"][aria-label="dlg-A"]')
    ).toBeTruthy();
    // Second dialog is in rootB
    expect(
      rootB.querySelector('[role="dialog"][aria-label="dlg-B"]')
    ).toBeTruthy();

    // Cleanup to avoid leaky DOM between tests
    await act(async () => {
      overlays.defaultExitDuration = 0;
      overlays.getInstance(id1 as unknown as OverlayId)!.close();
      overlays.getInstance(id2 as unknown as OverlayId)!.close();
    });
  });
});
