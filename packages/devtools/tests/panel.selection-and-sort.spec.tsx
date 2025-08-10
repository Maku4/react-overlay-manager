import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DevtoolsPanel } from '../src/DevtoolsPanel';
import {
  createOverlayManager,
  defineOverlay,
  type OverlayComponent,
  type InjectedOverlayProps,
  type PromiseWithId,
} from '@react-overlay-manager/core';

type P = { label?: string };
const Dlg: OverlayComponent<P, void> = defineOverlay<P, void>(
  ({ label = 'x', visible }: P & InjectedOverlayProps<void>) => {
    if (!visible) return <span data-testid="placeholder" />;
    return <div role="dialog" aria-label={`dlg-${label}`} />;
  }
);

describe('DevtoolsPanel selection and sort', () => {
  it('touches name sort branch and persists selected id to sessionStorage', async () => {
    const overlays = createOverlayManager({ dlg: Dlg });
    overlays.open('dlg', { label: 'Beta' });
    const pAlpha: PromiseWithId<void> = overlays.open('dlg', {
      label: 'Alpha',
    });
    const alphaId = pAlpha.id;
    await Promise.resolve();

    render(<DevtoolsPanel manager={overlays} closePanel={() => {}} />);

    // Switch to sort by name (ensures name branch is touched)
    const select = await screen.findByTitle('Sort');
    fireEvent.change(select, { target: { value: 'name' } });

    const rows = screen.getAllByRole('listitem');
    expect(rows.length).toBeGreaterThanOrEqual(2);

    // Select a row -> details should show and selection persisted
    fireEvent.click(rows[0]);
    expect(await screen.findByText(/Details:/)).toBeInTheDocument();

    // Selection persists (value equals some overlay id)
    const stored = sessionStorage.getItem('rom-devtools-selected');
    expect(stored).toMatch(/^overlay_/);
  });
});
