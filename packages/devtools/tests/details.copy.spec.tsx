import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OverlayDetails } from '../src/OverlayDetails';
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

describe('OverlayDetails copy actions', () => {
  it('copies id and props JSON, tolerates clipboard failures', async () => {
    const overlays = createOverlayManager({ dlg: Dlg });
    const p: PromiseWithId<void> = overlays.open('dlg', { label: 'X' });
    const id = p.id;
    await Promise.resolve();

    // Ensure clipboard API exists in JSDOM
    if (!('clipboard' in navigator)) {
      (navigator as any).clipboard = { writeText: async (_text: string) => {} };
    }
    const writeSpy = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue(undefined as unknown as void);

    render(<OverlayDetails manager={overlays} instanceId={id} />);

    const copyId = await screen.findByTitle('Copy ID');
    fireEvent.click(copyId);
    expect(writeSpy).toHaveBeenCalled();

    const copyJson = screen.getByTitle('Copy props JSON');
    fireEvent.click(copyJson);
    expect(writeSpy).toHaveBeenCalledTimes(2);

    // Failure path
    writeSpy.mockRejectedValueOnce(new Error('no clipboard'));
    fireEvent.click(copyJson);

    writeSpy.mockRestore();
  });
});
