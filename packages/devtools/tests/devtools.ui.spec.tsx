import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Devtools } from '../src/Devtools';
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

describe('Devtools UI basics', () => {
  it('shows toggle button and updates count', async () => {
    const overlays = createOverlayManager({ dlg: Dlg });
    render(<Devtools manager={overlays} />);

    // Toggle button is visible initially (panel closed)
    const btn = await screen.findByRole('button', {
      name: /Open Overlay Manager DevTools/i,
    });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveTextContent('Overlays');
    expect(btn).toHaveTextContent('0');

    // Opening an overlay should increment the badge
    overlays.open('dlg', { label: 'A' });
    // wait a tick for subscription to propagate
    await Promise.resolve();
    expect(btn).toHaveTextContent('1');

    // Click button to open panel
    fireEvent.click(btn);
    expect(
      await screen.findByRole('button', { name: 'Close DevTools' })
    ).toBeInTheDocument();
  });
});
