import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DevtoolsPanel } from '../src/DevtoolsPanel';
import {
  createOverlayManager,
  defineOverlay,
  type OverlayComponent,
  type InjectedOverlayProps,
  type PromiseWithId,
} from '@react-overlay-manager/core';

type P = { label?: string };
const Dlg: OverlayComponent<P, void> = defineOverlay<P, void>(
  ({ label = 'x', visible }: P & InjectedOverlayProps<void>) => {
    if (!visible) return <span data-testid="placeholder" />;
    return <div role="dialog" aria-label={`dlg-${label}`} />;
  }
);

describe('DevtoolsPanel interactions', () => {
  it('lists overlays, filters by id substring, sorts by visible', async () => {
    const overlays = createOverlayManager({ dlg: Dlg });
    // Pre-open two overlays
    overlays.open('dlg', { label: 'Beta' });
    const p2: PromiseWithId<void> = overlays.open('dlg', { label: 'Alpha' });
    const id2: string = p2.id;
    await Promise.resolve();

    render(<DevtoolsPanel manager={overlays} closePanel={() => {}} />);

    // Initially two rows
    const initialRows = await screen.findAllByRole('listitem');
    expect(initialRows.length).toBe(2);

    // Filter by id (use id2 exact)
    const input = screen.getByPlaceholderText('Filter by name or ID…');
    fireEvent.change(input, { target: { value: id2 } });
    const filteredRows = await screen.findAllByRole('listitem');
    expect(filteredRows.length).toBe(1);

    // Clear and sort by name
    fireEvent.change(input, { target: { value: '' } });
    const select = screen.getByTitle('Sort');

    // Sort by visible: both are visible at start; hide one to test ordering
    const instances = overlays.getInstancesByKey('dlg');
    overlays.hide(instances[0].id);
    await Promise.resolve();
    fireEvent.change(select, { target: { value: 'visible' } });
    const rows2 = screen.getAllByRole('listitem');
    // First row badge should indicate Visible, and there should be a Hidden badge present
    expect(rows2[0]).toHaveTextContent('Visible');
    const badgesText = rows2.map((r) => r.textContent || '').join(' ');
    expect(badgesText).toMatch(/Hidden/);
  });
});
