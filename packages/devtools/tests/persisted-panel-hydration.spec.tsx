import { expect, it, vi } from 'vitest';
import { act, within } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot, type Root } from 'react-dom/client';
import { createOverlayManager } from '@react-overlay-manager/core';

it('hydrates server markup without errors before restoring a persisted open panel', async () => {
  vi.stubEnv('NODE_ENV', 'development');
  sessionStorage.clear();
  const container = document.createElement('div');
  document.body.appendChild(container);
  let root: Root | undefined;

  try {
    const { OverlayManagerDevtools } = await import('../src');
    const manager = createOverlayManager();
    const app = <OverlayManagerDevtools manager={manager} />;
    let serverHtml: string;

    vi.stubGlobal('sessionStorage', undefined);
    try {
      serverHtml = renderToString(app);
    } finally {
      vi.unstubAllGlobals();
    }
    container.innerHTML = serverHtml;
    expect(
      within(container).getByRole('button', {
        name: /Open Overlay Manager DevTools/i,
      })
    ).toBeInTheDocument();

    sessionStorage.setItem('rom-devtools-open', '1');
    const onRecoverableError = vi.fn();
    await act(async () => {
      root = hydrateRoot(container, app, { onRecoverableError });
    });

    expect(
      within(container).getByRole('button', { name: 'Close DevTools' })
    ).toBeVisible();
    expect(onRecoverableError).not.toHaveBeenCalled();
  } finally {
    if (root) act(() => root!.unmount());
    container.remove();
    sessionStorage.clear();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  }
});
