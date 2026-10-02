import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createOverlayManager } from '@react-overlay-manager/core';

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.unstubAllEnvs();
});

it.each([
  ['opening and closing the panel', false],
  ['closing a panel restored from session storage', true],
] as const)(
  'keeps the floating button draggable after %s',
  async (_, persisted) => {
    vi.stubEnv('NODE_ENV', 'development');
    sessionStorage.clear();
    if (persisted) sessionStorage.setItem('rom-devtools-open', '1');

    const { OverlayManagerDevtools } = await import('../src');
    render(<OverlayManagerDevtools manager={createOverlayManager()} />);

    if (!persisted) {
      fireEvent.click(
        screen.getByRole('button', { name: /Open Overlay Manager DevTools/i })
      );
    }
    fireEvent.click(screen.getByRole('button', { name: 'Close DevTools' }));

    const button = screen.getByRole('button', {
      name: /Open Overlay Manager DevTools/i,
    });
    expect(button).toHaveStyle({ right: '20px', bottom: '20px' });

    fireEvent.mouseDown(button, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(document, { clientX: 90, clientY: 80 });
    fireEvent.mouseUp(document);

    expect(button).toHaveStyle({ right: '30px', bottom: '40px' });
  }
);
