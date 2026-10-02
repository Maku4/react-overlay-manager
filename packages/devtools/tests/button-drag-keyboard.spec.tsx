import { expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createOverlayManager } from '@react-overlay-manager/core';

it.each(['{Enter}', ' '])(
  'opens with %s after a drag releases outside the floating button',
  async (key) => {
    vi.stubEnv('NODE_ENV', 'development');
    sessionStorage.clear();
    const user = userEvent.setup();

    try {
      const { OverlayManagerDevtools } = await import('../src');
      render(<OverlayManagerDevtools manager={createOverlayManager()} />);
      const button = screen.getByRole('button', {
        name: /Open Overlay Manager DevTools/i,
      });
      await user.tab();
      expect(button).toHaveFocus();

      fireEvent.mouseDown(button, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(document, { clientX: 300, clientY: 300 });
      // Releasing outside the button produces no click on the button.
      fireEvent.mouseUp(document, { clientX: 300, clientY: 300 });
      expect(button).toHaveStyle({ right: '8px', bottom: '8px' });
      expect(button).toHaveFocus();
      expect(
        screen.queryByRole('button', { name: 'Close DevTools' })
      ).not.toBeInTheDocument();

      await user.keyboard(key);
      expect(
        screen.getByRole('button', { name: 'Close DevTools' })
      ).toBeVisible();
    } finally {
      cleanup();
      sessionStorage.clear();
      vi.unstubAllEnvs();
    }
  }
);
