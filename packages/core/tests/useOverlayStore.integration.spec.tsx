import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { memo, useRef } from 'react';
import { render, screen, act, cleanup } from '@testing-library/react';
import { OverlayManager } from '../src/components/OverlayManager';
import { createOverlayManager } from '../src/createOverlayManager';
import { defineOverlay } from '../src/defineOverlay';
import { useOverlayStore } from '../src/hooks/useOverlayStore';
import type { OverlayComponent, InjectedOverlayProps } from '../src/types';

type P = { label?: string };
const TestOverlay: OverlayComponent<P, void> = defineOverlay<P, void>(
  ({ label = 'x', visible }: P & InjectedOverlayProps<void>) => {
    // Render some content only when visible
    if (!visible) return <span data-testid="placeholder" />;
    return <div role="dialog" aria-label={`dlg-${label}`} />;
  }
);

const RenderCounter = memo(function RenderCounter({
  onRender,
  manager,
}: {
  onRender: () => void;
  manager: ReturnType<typeof createOverlayManager<{ dlg: typeof TestOverlay }>>;
}) {
  // Select only overlayStack.length so re-renders happen only on stack-length changes
  const length = useOverlayStore(manager as any, (s) => s.overlayStack.length);
  const renders = useRef(0);
  renders.current += 1;
  onRender();
  return (
    <div>
      <span data-testid="len">{length}</span>
      <span data-testid="renders">{renders.current}</span>
    </div>
  );
});

describe('useOverlayStore - render selectivity', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    cleanup();
  });

  it('component re-renders only when selected slice changes', async () => {
    const overlays = createOverlayManager({ dlg: TestOverlay });
    const onRender = vi.fn();

    render(
      <div>
        <OverlayManager manager={overlays} />
        <RenderCounter onRender={onRender} manager={overlays} />
      </div>
    );

    // Initial render
    expect(screen.getByTestId('len').textContent).toBe('0');
    expect(onRender).toHaveBeenCalled(); // first render
    onRender.mockClear();

    // Opening one overlay should change length from 0 -> 1 (triggers re-render)
    const p = overlays.open('dlg', { label: 'A' });
    const id = (p as any).id;

    // Wait a microtask tick for subscription to propagate
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId('len').textContent).toBe('1');
    expect(onRender).toHaveBeenCalledTimes(1);
    onRender.mockClear();

    // Updating props of the same instance must NOT change overlayStack.length
    act(() => {
      overlays.update(id, { label: 'B' });
    });

    await act(async () => {
      await Promise.resolve();
    });

    // No re-render expected because selector didn't change
    expect(onRender).not.toHaveBeenCalled();
    expect(screen.getByTestId('len').textContent).toBe('1');

    // Open another overlay => length 2 (re-render)
    overlays.open('dlg', { label: 'C' });
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId('len').textContent).toBe('2');
    expect(onRender).toHaveBeenCalledTimes(1);
  });
});
