import { createContext, useContext, useState } from 'react';
import {
  createOverlayManager,
  defineOverlay,
  type OverlayComponent,
  type OverlayId,
} from '@react-overlay-manager/core';
import { Dialog } from './Dialog';

export interface GraphNode {
  label: string;
  parent?: GraphNode;
  children: GraphNode[];
}

export interface ProfileProps {
  name: string;
  session: number;
  count: number;
  // Shown by DevTools as "9007199254740993n" and "[Circular]"
  stats: { visits: bigint };
  graph: GraphNode;
}

export interface ProfileResult {
  count: number;
  note: string;
}

export interface ConfirmProps {
  message: string;
}

type DemoRegistry = {
  profile: OverlayComponent<ProfileProps, ProfileResult | undefined>;
  confirm: OverlayComponent<ConfirmProps, boolean>;
  help: OverlayComponent<object, void>;
};

/** Lets the profile dialog ask the page to open a new profile session. */
export const ProfileActions = createContext<{ openProfile: () => void }>({
  openProfile: () => {},
});

export const ProfileDialog = defineOverlay<
  ProfileProps,
  ProfileResult | undefined
>(function Profile({
  id,
  name,
  session,
  count,
  visible,
  hide,
  close,
  manager,
}) {
  const overlays = manager.as<DemoRegistry>();
  const { openProfile } = useContext(ProfileActions);
  const [note, setNote] = useState('');

  async function reset() {
    const confirmed = await overlays.open('confirm', {
      message: `Reset the count of ${count} to 0?`,
    });
    if (confirmed && overlays.isOpen(id)) overlays.update(id, { count: 0 });
  }

  return (
    <Dialog
      title={`Profile: ${name}`}
      visible={visible}
      onDismiss={() => close()}
    >
      <p className="muted">
        Session #{session}, overlay ID <code>{id}</code>
      </p>

      <p className="count" aria-live="polite">
        Count: <strong>{count}</strong>
      </p>
      <div className="actions">
        <button
          type="button"
          data-autofocus
          onClick={() => overlays.update(id, { count: count + 1 })}
        >
          Add one
        </button>
        <button type="button" onClick={reset}>
          Reset…
        </button>
      </div>

      <label className="field">
        Note (component state)
        <input value={note} onChange={(e) => setNote(e.target.value)} />
      </label>

      <div className="actions">
        <button
          type="button"
          onClick={() => overlays.open('help', { stackingBehavior: 'stack' })}
        >
          Open help on top
        </button>
        <button type="button" onClick={hide}>
          Hide
        </button>
        <button
          type="button"
          onClick={() => {
            close();
            openProfile();
          }}
        >
          Close and reopen
        </button>
      </div>

      <div className="actions actions--end">
        <button type="button" onClick={() => close()}>
          Cancel
        </button>
        <button
          type="button"
          className="primary"
          onClick={() => close({ count, note })}
        >
          Save and close
        </button>
      </div>
    </Dialog>
  );
});

export const ConfirmDialog = defineOverlay<ConfirmProps, boolean>(
  function Confirm({ message, visible, close }) {
    return (
      <Dialog title="Confirm" visible={visible} onDismiss={() => close(false)}>
        <p>{message}</p>
        <div className="actions actions--end">
          <button type="button" data-autofocus onClick={() => close(false)}>
            Cancel
          </button>
          <button type="button" className="primary" onClick={() => close(true)}>
            Reset
          </button>
        </div>
      </Dialog>
    );
  }
);

export const HelpDialog = defineOverlay<object, void>(function Help({
  visible,
  close,
}) {
  return (
    <Dialog title="Help" visible={visible} onDismiss={() => close()}>
      <p>
        This dialog uses <code>stackingBehavior: &apos;stack&apos;</code>, so
        the profile stays visible underneath. The confirmation opened by
        &quot;Reset…&quot; uses the default{' '}
        <code>&apos;hide-previous&apos;</code> and hides the profile until it
        closes.
      </p>
      <p>
        Tab stays inside the top dialog. Escape closes it and focus returns to
        the button that opened it.
      </p>
      <div className="actions actions--end">
        <button type="button" data-autofocus onClick={() => close()}>
          Close help
        </button>
      </div>
    </Dialog>
  );
});

const registry: DemoRegistry = {
  profile: ProfileDialog,
  confirm: ConfirmDialog,
  help: HelpDialog,
};

export const createDemoOverlays = () => createOverlayManager(registry);

export type DemoOverlays = ReturnType<typeof createDemoOverlays>;

export const PROFILE_ID = 'profile' as OverlayId;

export function createGraph(): GraphNode {
  const root: GraphNode = { label: 'root', children: [] };
  root.children.push({ label: 'child', parent: root, children: [] });
  return root;
}
