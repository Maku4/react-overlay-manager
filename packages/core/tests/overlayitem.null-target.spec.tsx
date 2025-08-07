import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { OverlayManager } from '../src/components/OverlayManager';
import { createOverlayManager } from '../src/createOverlayManager';
import { defineOverlay } from '../src/defineOverlay';
import type { OverlayComponent, InjectedOverlayProps } from '../src/types';

type P = { label?: string };
const TestOverlay: OverlayComponent<P, void> = defineOverlay<P, void>(
  ({ label = 'x', visible }: P & InjectedOverlayProps<void>) => {
    if (!visible) return <span data-testid="placeholder" />;
    return <div role="dialog" aria-label={`dlg-${label}`} />;
  }
);

describe('OverlayItem - null portalTarget yields no render', () => {
  it('does not portal when portalTarget is null', async () => {
    const overlays = createOverlayManager({ dlg: TestOverlay });

    render(<OverlayManager manager={overlays} />);

    await act(async () => {
      overlays.open('dlg', { label: 'X', portalTarget: null });
    });

    expect(screen.queryByRole('dialog', { name: 'dlg-X' })).toBeNull();
  });
});
