import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { defineOverlay } from '../src/defineOverlay';
import { OverlayManagerCore } from '../src/manager/OverlayManagerCore';
import type { OverlayComponent, PromiseWithId, OverlayId } from '../src/types';

type NoProps = object;
type VoidResult = void;

const Dummy: OverlayComponent<NoProps, VoidResult> = defineOverlay<
  NoProps,
  void
>(() => React.createElement('div'));

describe('OverlayManagerCore - portal target and SSR defaults', () => {
  let originalDocument: any;

  beforeEach(() => {
    originalDocument = globalThis.document;
  });

  it('defaultPortalTarget is document.body when document exists', () => {
    // JSDOM provides document
    const manager = new OverlayManagerCore({ dummy: Dummy });
    // In JSDOM, document.body should exist
    expect(manager.defaultPortalTarget).toBeDefined();
    expect(manager.defaultPortalTarget).toBe(document.body);
  });

  it('defaultPortalTarget is null when document is not defined (SSR-like)', () => {
    // Temporarily remove document to simulate SSR
    // @ts-expect-error override
    globalThis.document = undefined;

    const manager = new OverlayManagerCore({ dummy: Dummy });
    expect(manager.defaultPortalTarget).toBeNull();

    // restore
    globalThis.document = originalDocument;
  });

  it('per-open portalTarget null is stored as null', () => {
    const manager = new OverlayManagerCore({ dummy: Dummy });

    const p: PromiseWithId<void> = manager.open('dummy', {
      portalTarget: null,
    });
    const id: OverlayId = p.id;

    const inst = manager.getInstance(id)!;
    expect(inst.portalTarget).toBeNull();
  });

  it('per-open portalTarget element overrides manager default', () => {
    const manager = new OverlayManagerCore({ dummy: Dummy });
    const el = document.createElement('div');
    document.body.appendChild(el);

    const p: PromiseWithId<void> = manager.open('dummy', { portalTarget: el });
    const id: OverlayId = p.id;

    const inst = manager.getInstance(id)!;
    expect(inst.portalTarget).toBe(el);
  });
});
