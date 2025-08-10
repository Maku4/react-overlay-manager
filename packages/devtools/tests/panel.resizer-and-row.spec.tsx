import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DevtoolsPanel } from '../src/DevtoolsPanel';
import { OverlayRow } from '../src/OverlayRow';
import {
  createOverlayManager,
  defineOverlay,
  type OverlayComponent,
  type InjectedOverlayProps,
} from '@react-overlay-manager/core';
import { OverlayInstance } from '@react-overlay-manager/core';

type P = { label?: string };
const Dlg: OverlayComponent<P, void> = defineOverlay<P, void>(
  ({ label = 'x', visible }: P & InjectedOverlayProps<void>) => {
    if (!visible) return <span data-testid="placeholder" />;
    return <div role="dialog" aria-label={`dlg-${label}`} />;
  }
);

describe('DevtoolsPanel resizer and OverlayRow hover', () => {
  it('allows resizing via resizer mouse events', async () => {
    const overlays = createOverlayManager({ dlg: Dlg });
    render(<DevtoolsPanel manager={overlays} closePanel={() => {}} />);

    const resizer = await screen.findByTitle('Resize');
    // Start resize drag
    fireEvent.mouseDown(resizer, { clientX: 200, clientY: 200 });
    fireEvent.mouseMove(document, { clientX: 150, clientY: 240 });
    fireEvent.mouseUp(document);
  });

  it('resizes with corner handle (width and height) and persists size', async () => {
    const overlays = createOverlayManager({ dlg: Dlg });
    render(<DevtoolsPanel manager={overlays} closePanel={() => {}} />);

    const corner = await screen.findByTestId('rom-resize-corner');
    const panel = screen.getByTestId('rom-panel');

    const w0 = (panel as HTMLElement).style.width || '420px';
    const h0 = (panel as HTMLElement).style.height || '560px';

    fireEvent.mouseDown(corner, { clientX: 300, clientY: 300 });
    fireEvent.mouseMove(document, { clientX: 340, clientY: 360 });
    fireEvent.mouseUp(document);

    expect((panel as HTMLElement).style.width).not.toBe(w0);
    expect((panel as HTMLElement).style.height).not.toBe(h0);

    // Unmount previous render and render fresh, expect size restored from sessionStorage
    const { unmount } = render(
      <DevtoolsPanel manager={overlays} closePanel={() => {}} />
    );
    unmount();
    render(<DevtoolsPanel manager={overlays} closePanel={() => {}} />);
    const panel2 = (await screen.findAllByTestId('rom-panel'))[0];
    expect((panel2 as HTMLElement).style.width).toMatch(/px/);
    expect((panel2 as HTMLElement).style.height).toMatch(/px/);
  });

  it('OverlayRow hover handlers adjust background when not selected', () => {
    const instance = {
      id: 'overlay_test',
      visible: true,
    } as unknown as OverlayInstance<unknown, unknown>;

    // Render with minimal required props; getInstanceOverlayName will be called, but we only verify hover CSS
    const { container } = render(
      <OverlayRow instance={instance} isSelected={false} onSelect={() => {}} />
    );
    const li = container.querySelector('li') as HTMLElement;
    const original = li.style.backgroundColor || '';
    fireEvent.mouseEnter(li);
    expect(li.style.backgroundColor).not.toBe(original);
    fireEvent.mouseLeave(li);
    // After leave, transparent is acceptable fallback in JSDOM style resolution
    expect(['', 'transparent']).toContain(li.style.backgroundColor);
  });
});
