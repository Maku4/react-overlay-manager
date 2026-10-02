import { expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createOverlayManager,
  defineOverlay,
} from '@react-overlay-manager/core';

it('selects overlay details with Tab, Enter and Space while retaining focus', async () => {
  vi.stubEnv('NODE_ENV', 'development');
  sessionStorage.clear();
  const user = userEvent.setup();

  try {
    const { OverlayManagerDevtools } = await import('../src');
    const Dialog = defineOverlay<{ label: string }, void>(() =>
      createElement('div')
    );
    const manager = createOverlayManager({ dialog: Dialog });
    const first = manager.open('dialog', { label: 'first details' });
    const second = manager.open('dialog', { label: 'second details' });
    render(<OverlayManagerDevtools manager={manager} />);
    await user.click(
      screen.getByRole('button', { name: /Open Overlay Manager DevTools/i })
    );

    for (const [opened, label, key] of [
      [first, 'first details', '{Enter}'],
      [second, 'second details', ' '],
    ] as const) {
      const select = screen.getByRole('button', {
        name: new RegExp(opened.id),
      });
      for (
        let step = 0;
        step < 20 && document.activeElement !== select;
        step++
      ) {
        await user.tab();
      }
      expect(select).toHaveFocus();
      expect(select).toBeVisible();
      await user.keyboard(key);
      expect(
        screen.getByText(new RegExp(label), { selector: 'pre' })
      ).toBeVisible();
      expect(select).toHaveFocus();
    }
  } finally {
    cleanup();
    vi.unstubAllEnvs();
    sessionStorage.clear();
  }
});
