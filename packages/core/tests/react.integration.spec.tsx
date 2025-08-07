import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useEffect } from 'react';
import { render, screen, act, cleanup } from '@testing-library/react';
import { OverlayManager } from '../src/components/OverlayManager';
import { createOverlayManager } from '../src/createOverlayManager';
import { defineOverlay } from '../src/defineOverlay';
import type {
  OverlayComponent,
  InjectedOverlayProps,
  OverlayId,
} from '../src/types';

type DialogProps = { message?: string };
type DialogResult = boolean;

/**
 * defineOverlay typing expects a component returning React.JSX.Element (non-null).
 * For tests where we need to "not render" when invisible, return an empty element instead of null
 * to satisfy the stricter return type. This keeps behavior similar for the test purposes.
 */
const TestDialog: OverlayComponent<DialogProps, DialogResult> = defineOverlay<
  DialogProps,
  DialogResult
>(
  ({
    message = 'hello',
    visible,
    close,
    onExitComplete,
  }: DialogProps & InjectedOverlayProps<boolean>) => {
    useEffect(() => {
      // mimic animation end when not visible
      if (!visible) {
        // signal immediate exit complete (tests can assert removal)
        onExitComplete();
      }
    }, [visible, onExitComplete]);

    if (!visible) return <span data-testid="placeholder" />;

    return (
      <div role="dialog" aria-label="test-dialog">
        <p data-testid="msg">{message}</p>
        <button onClick={() => close(true)}>OK</button>
      </div>
    );
  }
);

describe('React integration - OverlayManager + OverlayItem', () => {
  beforeEach(() => {
    // ensure clean DOM
    document.body.innerHTML = '';
  });

  afterEach(() => {
    cleanup();
  });

  it('renders overlay via registry and removes it after close (manual onExitComplete)', async () => {
    const overlays = createOverlayManager({ dialog: TestDialog });

    render(
      <div>
        <div id="portal-root" />
        <OverlayManager
          manager={overlays}
          portalTarget={document.getElementById('portal-root')}
        />
      </div>
    );

    // Get portal root after render
    const portalRoot = document.getElementById('portal-root');

    let p: any;
    let id: OverlayId;

    await act(async () => {
      // Set portal target before opening overlay
      overlays.defaultPortalTarget = portalRoot;
      p = overlays.open('dialog', { message: 'hi' });
      id = p.id;
    });

    // Should render
    expect(
      await screen.findByRole('dialog', { name: 'test-dialog' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('msg').textContent).toBe('hi');

    // Close and rely on onExitComplete triggered in effect when visible=false
    await act(async () => {
      overlays.getInstance(id)!.close(true);
    });

    // Allow effect/microtasks to run
    await act(async () => {
      await Promise.resolve();
    });

    // Dialog should disappear because onExitComplete removed it
    expect(screen.queryByRole('dialog', { name: 'test-dialog' })).toBeNull();
  });

  it('respects defaultExitDuration when no manual completion', async () => {
    // Dialog that does not call onExitComplete; rely on timer removal
    const TimerOnlyDialog: OverlayComponent<DialogProps, DialogResult> =
      defineOverlay<DialogProps, DialogResult>(
        ({
          message = 'timer',
          visible,
          close,
        }: DialogProps & InjectedOverlayProps<boolean>) => {
          if (!visible) return <span data-testid="placeholder" />;
          return (
            <div role="dialog" aria-label="timer-dialog">
              <p>{message}</p>
              <button onClick={() => close(true)}>OK</button>
            </div>
          );
        }
      );

    const overlays = createOverlayManager({ dlg: TimerOnlyDialog });

    render(
      <div>
        <div id="portal-root-2" />
        <OverlayManager
          manager={overlays}
          defaultExitDuration={10}
          portalTarget={document.getElementById('portal-root-2')}
        />
      </div>
    );

    // Get portal root after render
    const portalRoot = document.getElementById('portal-root-2');

    let p: any;
    let id: OverlayId;

    await act(async () => {
      // Set portal target before opening overlay
      overlays.defaultPortalTarget = portalRoot;
      p = overlays.open('dlg');
      id = p.id;
    });

    expect(
      await screen.findByRole('dialog', { name: 'timer-dialog' })
    ).toBeInTheDocument();

    // Close (no onExitComplete); rely on defaultExitDuration timer (10ms)
    await act(async () => {
      overlays.getInstance(id)!.close(true);
    });

    // Use fake timers only for this specific test
    vi.useFakeTimers();

    // Advance fake timers for removal
    await act(async () => {
      vi.advanceTimersByTime(11);
    });

    vi.useRealTimers();

    expect(screen.queryByRole('dialog', { name: 'timer-dialog' })).toBeNull();
  });

  it('zIndex increases with stacking order (direct style assertions)', async () => {
    const overlays = createOverlayManager({ dialog: TestDialog });

    render(
      <div>
        <div id="portal-root-3" />
        <OverlayManager
          manager={overlays}
          zIndexBase={500}
          portalTarget={document.getElementById('portal-root-3')}
          stackingBehavior="stack"
        />
      </div>
    );

    // Get portal root after render
    const portalRoot = document.getElementById('portal-root-3');

    await act(async () => {
      // Set portal target before opening overlays
      overlays.defaultPortalTarget = portalRoot;
      overlays.open('dialog', { message: 'A' });
      overlays.open('dialog', { message: 'B' });
    });

    // Two dialogs rendered
    const dialogs = await screen.findAllByRole('dialog');
    expect(dialogs.length).toBe(2);

    // The OverlayItem renders a container div around the dialog; the dialog is a child.
    // So the container should be the parentElement of the dialog node.
    const container1 = dialogs[0].parentElement as HTMLElement;
    const container2 = dialogs[1].parentElement as HTMLElement;

    // Direct z-index assertions: first overlay gets base, second base+1
    expect(container1.style.zIndex).toBe('500');
    expect(container2.style.zIndex).toBe('501');
  });
});
