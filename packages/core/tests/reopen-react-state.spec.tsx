import { expect, it, vi } from 'vitest';
import { useEffect, useState } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { createOverlayManager, defineOverlay, OverlayManager } from '../src';

it('preserves hidden overlay state but remounts after a closing ID is reopened', () => {
  vi.useFakeTimers();
  const mounted = vi.fn();
  const Counter = defineOverlay(function Counter() {
    const [count, setCount] = useState(0);
    useEffect(() => {
      mounted();
    }, []);
    return <button onClick={() => setCount(count + 1)}>Count {count}</button>;
  });
  const manager = createOverlayManager({ counter: Counter });
  const opened = manager.open('counter', { exitDuration: 100 });

  try {
    render(<OverlayManager manager={manager} />);
    fireEvent.click(screen.getByRole('button', { name: 'Count 0' }));
    expect(screen.getByRole('button', { name: 'Count 1' })).toBeVisible();

    act(() => {
      manager.getInstance(opened.id)!.hide();
      manager.open('counter', { id: opened.id });
    });
    expect(screen.getByRole('button', { name: 'Count 1' })).toBeVisible();
    expect(mounted).toHaveBeenCalledTimes(1);

    act(() => {
      manager.getInstance(opened.id)!.close();
      manager.open('counter', { id: opened.id, exitDuration: 100 });
    });
    expect(screen.getByRole('button', { name: 'Count 0' })).toBeVisible();
    expect(mounted).toHaveBeenCalledTimes(2);
  } finally {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
  }
});
