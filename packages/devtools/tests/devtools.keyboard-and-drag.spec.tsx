import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
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

afterEach(() => {
  // Reset stored state to avoid inter-test coupling
  try {
    sessionStorage.removeItem('rom-devtools-open');
  } catch {}
});

describe('Devtools - keyboard toggle and draggable button', () => {
  it('toggles with Ctrl/Meta + Shift + O and persists state to sessionStorage', async () => {
    const overlays = createOverlayManager({ dlg: Dlg });
    render(<Devtools manager={overlays} />);

    const btn = await screen.findByRole('button', {
      name: /Open Overlay Manager DevTools/i,
    });

    // Hover styles change
    const originalBg = (btn as HTMLButtonElement).style.backgroundColor;
    fireEvent.mouseEnter(btn);
    expect((btn as HTMLButtonElement).style.backgroundColor).not.toBe(
      originalBg
    );
    fireEvent.mouseLeave(btn);
    expect((btn as HTMLButtonElement).style.backgroundColor).toBe(originalBg);

    // Keyboard toggle open (Ctrl+Shift+O)
    fireEvent.keyDown(window, { ctrlKey: true, shiftKey: true, key: 'o' });
    expect(
      await screen.findByRole('button', { name: 'Close DevTools' })
    ).toBeInTheDocument();
    expect(sessionStorage.getItem('rom-devtools-open')).toBe('1');

    // Keyboard toggle close (Meta+Shift+O)
    fireEvent.keyDown(window, { metaKey: true, shiftKey: true, key: 'o' });
    await screen.findByRole('button', {
      name: /Open Overlay Manager DevTools/i,
    });
    expect(sessionStorage.getItem('rom-devtools-open')).toBe('0');
  });

  it('button is draggable and updates position while closed', async () => {
    const overlays = createOverlayManager({ dlg: Dlg });
    render(<Devtools manager={overlays} />);

    const btn = await screen.findByRole('button', {
      name: /Open Overlay Manager DevTools/i,
    });

    // Start drag
    fireEvent.mouseDown(btn, { clientX: 100, clientY: 100 });
    // Move
    fireEvent.mouseMove(document, { clientX: 120, clientY: 130 });
    // Styles should be applied
    expect((btn as HTMLButtonElement).style.right).toMatch(/px/);
    expect((btn as HTMLButtonElement).style.bottom).toMatch(/px/);
    // End drag
    fireEvent.mouseUp(document);
  });

  it('ignores shortcut when typing in input', async () => {
    const overlays = createOverlayManager({ dlg: Dlg });
    render(
      <div>
        <input aria-label="Some Input" />
        <Devtools manager={overlays} />
      </div>
    );

    const input = await screen.findByLabelText('Some Input');
    input.focus();
    fireEvent.keyDown(window, { ctrlKey: true, shiftKey: true, key: 'o' });
    // Panel should not open when typing in input
    expect(sessionStorage.getItem('rom-devtools-open')).not.toBe('1');
  });

  it('ignores shortcut when typing in contenteditable', async () => {
    const overlays = createOverlayManager({ dlg: Dlg });
    render(
      <div>
        <div aria-label="Editable" contentEditable tabIndex={0} />
        <Devtools manager={overlays} />
      </div>
    );

    const editable = await screen.findByLabelText('Editable');
    editable.focus();
    // Fire a focus event to ensure JSDOM updates activeElement
    fireEvent.focus(editable);
    fireEvent.keyDown(editable, { metaKey: true, shiftKey: true, key: 'o' });
    expect(sessionStorage.getItem('rom-devtools-open')).not.toBe('1');
  });

  it('handles sessionStorage get/set errors gracefully', async () => {
    const getSpy = vi
      .spyOn(window.sessionStorage, 'getItem')
      .mockImplementation(() => {
        throw new Error('get boom');
      });
    const setSpy = vi
      .spyOn(window.sessionStorage, 'setItem')
      .mockImplementation(() => {
        throw new Error('set boom');
      });

    const overlays = createOverlayManager({ dlg: Dlg });
    render(<Devtools manager={overlays} />);

    const btn = await screen.findByRole('button', {
      name: /Open Overlay Manager DevTools/i,
    });

    // Open and close to trigger setItem inside effect
    act(() => {
      fireEvent.keyDown(window, { ctrlKey: true, shiftKey: true, key: 'o' });
    });
    act(() => {
      fireEvent.keyDown(window, { ctrlKey: true, shiftKey: true, key: 'o' });
    });

    // Hover no-ops even with broken storage
    fireEvent.mouseEnter(btn);
    fireEvent.mouseLeave(btn);

    getSpy.mockRestore();
    setSpy.mockRestore();
  });
});
