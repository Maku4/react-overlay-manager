import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OverlayDetails } from '../src/OverlayDetails';
import {
  createOverlayManager,
  defineOverlay,
  type OverlayComponent,
  type InjectedOverlayProps,
  type PromiseWithId,
} from '@react-overlay-manager/core';

type P = { label?: string; count?: number };
const Dlg: OverlayComponent<P, void> = defineOverlay<P, void>(
  ({ label = 'x', count = 1, visible }: P & InjectedOverlayProps<void>) => {
    if (!visible) return <span data-testid="placeholder" />;
    return (
      <div>
        <div role="dialog" aria-label={`dlg-${label}`} />
        <span data-testid="count">{count}</span>
      </div>
    );
  }
);

describe('OverlayDetails behavior', () => {
  it('renders not found when instance removed and supports copy controls', async () => {
    const overlays = createOverlayManager({ dlg: Dlg });
    const p: PromiseWithId<void> = overlays.open('dlg', {
      label: 'X',
      count: 3,
    });
    const id = p.id;
    await Promise.resolve();

    render(<OverlayDetails manager={overlays} instanceId={id} />);
    // Headers and props view present
    expect(await screen.findByText(/Details:/)).toBeInTheDocument();
    expect(screen.getByText('Props')).toBeInTheDocument();

    // Toggle Pretty checkbox
    const pretty = screen.getByRole('checkbox');
    fireEvent.click(pretty);

    // Copy buttons exist (cannot assert clipboard in JSDOM reliably)
    expect(screen.getByTitle('Copy ID')).toBeInTheDocument();
    expect(screen.getByTitle('Copy props JSON')).toBeInTheDocument();

    // Remove instance and verify not found UI
    overlays.defaultExitDuration = 0;
    overlays.getInstance(id)!.close();
    await Promise.resolve();
    expect(await screen.findByText(/Instance not found/)).toBeInTheDocument();
  });
});
