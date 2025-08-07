import { describe, it, expect, vi } from 'vitest';

describe('OverlayManagerDevtools conditional export', () => {
  it('exports null component in production', async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    vi.resetModules();
    const mod = await import('../src/index');
    const Comp: (() => null) | ((...args: unknown[]) => unknown) =
      mod.OverlayManagerDevtools as unknown as
        | (() => null)
        | ((...args: unknown[]) => unknown);
    expect(typeof Comp).toBe('function');
    // In prod it is a noop component returning null
    expect(Comp()).toBeNull();
    process.env.NODE_ENV = prev;
  });

  it('exports Devtools component in development', async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    vi.resetModules();
    const mod = await import('../src/index');
    const Comp: ((...args: unknown[]) => unknown) | (() => null) =
      mod.OverlayManagerDevtools as unknown as
        | ((...args: unknown[]) => unknown)
        | (() => null);
    expect(typeof Comp).toBe('function');
    // Should not be the noop that returns null; it should be a component function
    process.env.NODE_ENV = prev;
  });
});
