import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createOverlayManager,
  defineOverlay,
} from '@react-overlay-manager/core';

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

async function inspectAndCopy(data: object) {
  vi.stubEnv('NODE_ENV', 'development');
  sessionStorage.clear();
  const user = userEvent.setup();
  const writeText = vi.spyOn(navigator.clipboard, 'writeText');
  const { OverlayManagerDevtools } = await import('../src');
  const DataOverlay = defineOverlay<{ data: object }, void>(() => null);
  const manager = createOverlayManager({ data: DataOverlay });
  const opened = manager.open('data', { data });

  render(<OverlayManagerDevtools manager={manager} />);
  await user.click(
    screen.getByRole('button', { name: /Open Overlay Manager DevTools/i })
  );
  await user.click(screen.getByText(`(${opened.id})`));
  await user.click(screen.getByRole('checkbox', { name: 'Pretty' }));

  const displayedProps = screen.getByText(/"data":/, {
    selector: 'pre',
  }).textContent!;
  expect(displayedProps).not.toContain('\n');
  await user.click(screen.getByTitle('Copy props JSON'));
  expect(writeText).toHaveBeenLastCalledWith(displayedProps);
  return JSON.parse(displayedProps).data;
}

it('preserves large arrays and deeply nested JSON props in compact view and copy', async () => {
  const data = {
    rows: Array.from({ length: 150 }, (_, index) => ({ index })),
    nested: {
      one: {
        two: {
          three: {
            four: {
              five: {
                six: {
                  seven: {
                    eight: {
                      nine: {
                        ten: 'deep value',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  expect(await inspectAndCopy(data)).toEqual(data);
});

it('preserves an own __proto__ data key in compact view and copy', async () => {
  const data = JSON.parse('{"__proto__":{"label":"ordinary data"}}');
  const inspected = await inspectAndCopy(data);

  expect(Object.prototype.hasOwnProperty.call(inspected, '__proto__')).toBe(
    true
  );
  expect(inspected).toEqual(data);
});
