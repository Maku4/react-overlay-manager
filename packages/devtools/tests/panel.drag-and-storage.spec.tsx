import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DevtoolsPanel } from '../src/DevtoolsPanel';
import {
  createOverlayManager,
  defineOverlay,
  type OverlayComponent,
  type InjectedOverlayProps,
} from '@react-overlay-manager/core';

type P = { label?: string };
const Dlg: OverlayComponent<P, void> = defineOverlay<P, void>(
  ({ label = 'x', visible }: P & InjectedOverlayProps<void>) => {
    if (!visible) return <span data-testid="placeholder" />;
    return <div role="dialog" aria-label={`dlg-${label}`} />;
  }
);

describe('DevtoolsPanel - drag guard and storage resilience', () => {
  it('does not drag when mousedown starts on interactive header element', async () => {
    const overlays = createOverlayManager({ dlg: Dlg });
    render(<DevtoolsPanel manager={overlays} closePanel={() => {}} />);

    const panel = await screen.findByTestId('rom-panel');
    const beforeTop = (panel as HTMLElement).style.top;
    const beforeLeft = (panel as HTMLElement).style.left;

    const closeBtn = await screen.findByRole('button', {
      name: 'Close DevTools',
    });
    fireEvent.mouseDown(closeBtn, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(document, { clientX: 160, clientY: 160 });
    fireEvent.mouseUp(document);

    expect((panel as HTMLElement).style.top).toBe(beforeTop);
    expect((panel as HTMLElement).style.left).toBe(beforeLeft);
  });

  it('renders even if sessionStorage.getItem throws for pos/size keys', async () => {
    const getSpy = vi
      .spyOn(window.sessionStorage, 'getItem')
      .mockImplementation(() => {
        throw new Error('boom');
      });
    const overlays = createOverlayManager({ dlg: Dlg });
    render(<DevtoolsPanel manager={overlays} closePanel={() => {}} />);

    expect(await screen.findByTestId('rom-panel-header')).toBeInTheDocument();

    getSpy.mockRestore();
  });
});
