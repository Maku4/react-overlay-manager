import { expect, it, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createOverlayManager,
  defineOverlay,
} from '@react-overlay-manager/core';

it('inspects and copies BigInt props without expanding the injected manager', async () => {
  vi.stubEnv('NODE_ENV', 'development');
  sessionStorage.clear();
  const user = userEvent.setup();
  const writeText = vi.spyOn(navigator.clipboard, 'writeText');

  try {
    const { OverlayManagerDevtools } = await import('../src');
    const AmountOverlay = defineOverlay<{ amount: bigint }, void>(() => null);
    const manager = createOverlayManager({ amount: AmountOverlay });
    manager.open('amount', { amount: BigInt('9007199254740993') });

    render(<OverlayManagerDevtools manager={manager} />);
    await user.click(
      screen.getByRole('button', { name: /Open Overlay Manager DevTools/i })
    );
    await user.click(screen.getByRole('listitem'));

    const displayedProps = screen.getByText(/9007199254740993/, {
      selector: 'pre',
    }).textContent!;
    const inspectedProps = JSON.parse(displayedProps);
    expect(String(inspectedProps.amount)).toMatch(/^9007199254740993n?$/);
    expect(inspectedProps.manager).not.toBeTypeOf('object');

    await user.click(screen.getByTitle('Copy props JSON'));
    expect(writeText).toHaveBeenLastCalledWith(displayedProps);
  } finally {
    cleanup();
    writeText.mockRestore();
    vi.unstubAllEnvs();
    sessionStorage.clear();
  }
});
