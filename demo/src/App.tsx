import { useEffect, useRef, useState } from 'react';
import {
  getInstanceOverlayName,
  OverlayManager,
  useOverlayStore,
} from '@react-overlay-manager/core';
import { OverlayManagerDevtools } from '@react-overlay-manager/devtools';
import { HYDRATION_ERROR_EVENT, hydrationErrors } from './hydration';
import {
  createDemoOverlays,
  createGraph,
  PROFILE_ID,
  ProfileActions,
  type DemoOverlays,
} from './overlays';

export function App() {
  // One manager per rendered app. On the server that means one per request.
  const [manager] = useState(createDemoOverlays);
  const [log, setLog] = useState<{ id: number; text: string }[]>([]);
  const logId = useRef(0);

  const session = useRef(0);

  const addLog = (text: string) =>
    setLog((entries) =>
      [{ id: ++logId.current, text }, ...entries].slice(0, 8)
    );

  function openProfile() {
    const current = ++session.current;
    const promise = manager.open('profile', {
      id: PROFILE_ID,
      name: 'Ada',
      session: current,
      count: 0,
      stats: { visits: BigInt('9007199254740993') },
      graph: createGraph(),
    });
    addLog(`Session #${current} opened.`);
    promise.then((result) =>
      addLog(
        result
          ? `Session #${current} saved: count ${result.count}, note "${result.note}".`
          : `Session #${current} cancelled.`
      )
    );
  }

  return (
    <ProfileActions.Provider value={{ openProfile }}>
      <main className="page">
        <header className="page-header">
          <h1>React Overlay Manager demo</h1>
          <HydrationStatus />
        </header>

        <ProfileControls manager={manager} openProfile={openProfile} />
        <StackTable manager={manager} />

        <section aria-labelledby="results-title">
          <h2 id="results-title">Results</h2>
          {log.length === 0 ? (
            <p className="muted">Results of closed overlays appear here.</p>
          ) : (
            <ol className="log" aria-live="polite">
              {log.map((entry) => (
                <li key={entry.id}>{entry.text}</li>
              ))}
            </ol>
          )}
        </section>

        <section aria-labelledby="devtools-title">
          <h2 id="devtools-title">DevTools</h2>
          <ol className="steps">
            <li>
              Open the panel with the <strong>Overlays</strong> button or{' '}
              <kbd>Ctrl/Cmd</kbd> + <kbd>Shift</kbd> + <kbd>O</kbd>.
            </li>
            <li>
              Open the profile, then select its row. Tab to the row and press{' '}
              <kbd>Enter</kbd> or <kbd>Space</kbd> to select it from the
              keyboard.
            </li>
            <li>
              In the props, <code>stats.visits</code> shows as{' '}
              <code>&quot;9007199254740993n&quot;</code>,{' '}
              <code>graph.children[0].parent</code> as{' '}
              <code>&quot;[Circular]&quot;</code> and <code>manager</code> as{' '}
              <code>&quot;[OverlayManager]&quot;</code>. Copy JSON copies the
              same text.
            </li>
            <li>
              Reload the page with the panel open. The server sends it closed
              and it reopens after hydration.
            </li>
          </ol>
        </section>
      </main>

      <OverlayManager manager={manager} defaultExitDuration={400} />
      <OverlayManagerDevtools manager={manager} />
    </ProfileActions.Provider>
  );
}

function ProfileControls({
  manager,
  openProfile,
}: {
  manager: DemoOverlays;
  openProfile: () => void;
}) {
  const profile = useOverlayStore(manager, (s) => s.instances.get(PROFILE_ID));
  const isHidden = !!profile && !profile.isClosing && !profile.visible;

  return (
    <section aria-labelledby="profile-title">
      <h2 id="profile-title">Profile dialog</h2>
      <p>
        The count is stored in the overlay&apos;s props with{' '}
        <code>update()</code>. The note is local component state. Hiding keeps
        both, because the overlay stays mounted.
      </p>
      <div className="actions">
        <button
          type="button"
          className="primary"
          disabled={!!profile && !profile.isClosing && profile.visible}
          onClick={isHidden ? () => manager.show(PROFILE_ID) : openProfile}
        >
          {isHidden ? 'Show hidden profile' : 'Open profile'}
        </button>
      </div>
      <p className="muted">
        Closing resolves the promise and fades the dialog out. The manager
        removes it when the transition ends, or after 400 ms if your system
        reduces motion. &quot;Close and reopen&quot; inside the dialog reuses
        the ID while the old dialog is still fading out. The reopened dialog
        starts a new session with count 0 and an empty note.
      </p>
    </section>
  );
}

function StackTable({ manager }: { manager: DemoOverlays }) {
  const state = useOverlayStore(manager);

  return (
    <section aria-labelledby="stack-title">
      <h2 id="stack-title">Overlay stack</h2>
      {state.overlayStack.length === 0 ? (
        <p className="muted">No overlays are open.</p>
      ) : (
        <table className="stack">
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Component</th>
              <th scope="col">State</th>
            </tr>
          </thead>
          <tbody>
            {state.overlayStack.map((id) => {
              const instance = state.instances.get(id);
              if (!instance) return null;
              return (
                <tr key={id}>
                  <td>
                    <code>{id}</code>
                  </td>
                  <td>{getInstanceOverlayName(instance)}</td>
                  <td>
                    {instance.isClosing
                      ? 'Closing'
                      : instance.visible
                        ? 'Visible'
                        : 'Hidden'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}

function HydrationStatus() {
  const [hydrated, setHydrated] = useState(false);
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    const sync = () => setErrorCount(hydrationErrors.length);
    setHydrated(true);
    sync();
    window.addEventListener(HYDRATION_ERROR_EVENT, sync);
    return () => window.removeEventListener(HYDRATION_ERROR_EVENT, sync);
  }, []);

  const text = !hydrated
    ? 'Server HTML, not hydrated yet'
    : errorCount > 0
      ? `Hydrated with ${errorCount} recoverable error${errorCount === 1 ? '' : 's'}, see the console`
      : 'Hydrated without mismatches';

  return (
    <p
      className={`status ${hydrated ? (errorCount > 0 ? 'status--error' : 'status--ok') : ''}`}
      data-hydrated={hydrated}
      role="status"
    >
      {text}
    </p>
  );
}
