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
