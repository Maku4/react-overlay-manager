import { expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createOverlayManager,
  defineOverlay,
} from '@react-overlay-manager/core';

it('allows Show for a hidden overlay but prevents reviving a closing overlay', async () => {
  vi.stubEnv('NODE_ENV', 'development');
  sessionStorage.clear();
  const user = userEvent.setup();

  try {
    const { OverlayManagerDevtools } = await import('../src');
    const Dialog = defineOverlay(() => createElement('div'));
    const manager = createOverlayManager({ dialog: Dialog });
    const opened = manager.open('dialog', { exitDuration: null });
    render(<OverlayManagerDevtools manager={manager} />);
    await user.click(
      screen.getByRole('button', { name: /Open Overlay Manager DevTools/i })
    );
    await user.click(screen.getByText(`(${opened.id})`));

    await user.click(screen.getByRole('button', { name: 'Hide', exact: true }));
    const hiddenShow = screen.getByRole('button', {
      name: 'Show',
      exact: true,
    });
    expect(hiddenShow).toBeEnabled();
    await user.click(hiddenShow);
    expect(manager.getInstance(opened.id)).toMatchObject({
      visible: true,
      isClosing: false,
    });

    await user.click(
      screen.getByRole('button', { name: 'Close', exact: true })
    );
    await expect(opened).resolves.toBeUndefined();
    expect(manager.getInstance(opened.id)).toMatchObject({
      visible: false,
      isClosing: true,
    });
    const closingShow = screen.queryByRole('button', {
      name: 'Show',
      exact: true,
    });
    if (closingShow) {
      expect(closingShow).toBeDisabled();
      await user.click(closingShow);
    }
    expect(manager.getInstance(opened.id)).toMatchObject({
      visible: false,
      isClosing: true,
    });
  } finally {
    cleanup();
    sessionStorage.clear();
    vi.unstubAllEnvs();
  }
});
