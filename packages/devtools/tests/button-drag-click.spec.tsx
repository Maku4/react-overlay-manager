import { expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createOverlayManager } from '@react-overlay-manager/core';

it('keeps the floating button closed after a drag but opens after an ordinary click', async () => {
  vi.stubEnv('NODE_ENV', 'development');
  sessionStorage.clear();

  try {
    const { OverlayManagerDevtools } = await import('../src');
    render(<OverlayManagerDevtools manager={createOverlayManager()} />);
    const button = screen.getByRole('button', {
      name: /Open Overlay Manager DevTools/i,
    });

    fireEvent.mouseDown(button, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(document, { clientX: 90, clientY: 80 });
    fireEvent.mouseUp(button, { clientX: 90, clientY: 80 });
    // Browsers emit a click after release. Real browser gesture proof is separate.
    fireEvent.click(button, { clientX: 90, clientY: 80 });

    expect(
      screen.queryByRole('button', { name: 'Close DevTools' })
    ).not.toBeInTheDocument();
    expect(button).toBeInTheDocument();
    expect(button).toHaveStyle({ right: '30px', bottom: '40px' });

    fireEvent.mouseDown(button, { clientX: 90, clientY: 80 });
    fireEvent.mouseMove(document, { clientX: 80, clientY: 70 });
    fireEvent.mouseUp(button, { clientX: 80, clientY: 70 });
    fireEvent.click(button, { clientX: 80, clientY: 70 });
    expect(button).toHaveStyle({ right: '40px', bottom: '50px' });
    expect(button).toBeInTheDocument();

    fireEvent.mouseDown(button, { clientX: 80, clientY: 70 });
    fireEvent.mouseUp(button, { clientX: 80, clientY: 70 });
    fireEvent.click(button, { clientX: 80, clientY: 70 });
    expect(
      screen.getByRole('button', { name: 'Close DevTools' })
    ).toBeVisible();
  } finally {
    cleanup();
    sessionStorage.clear();
    vi.unstubAllEnvs();
  }
});
