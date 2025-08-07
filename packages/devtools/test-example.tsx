import { createOverlayManager, defineOverlay } from 'react-overlay-manager';
import { OverlayManagerDevtools } from './src/index';

// Example overlay components
const ConfirmDialog = defineOverlay<{ message: string }, boolean>(
  ({ message, close }) => (
    <div
      style={{
        padding: '20px',
        backgroundColor: 'white',
        border: '1px solid #ccc',
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
      }}
    >
      <p>{message}</p>
      <button onClick={() => close(true)}>Yes</button>
      <button onClick={() => close(false)}>No</button>
    </div>
  )
);

const AlertDialog = defineOverlay<{ title: string; message: string }, void>(
  ({ title, message, close }) => (
    <div
      style={{
        padding: '20px',
        backgroundColor: 'white',
        border: '1px solid #ccc',
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
      }}
    >
      <h3>{title}</h3>
      <p>{message}</p>
      <button onClick={() => close()}>OK</button>
    </div>
  )
);

// Create overlay registry
const overlayRegistry = {
  confirm: ConfirmDialog,
  alert: AlertDialog,
} as const;

// Create manager
const manager = createOverlayManager(overlayRegistry);

// Test component
export function TestApp() {
  const handleOpenConfirm = async () => {
    const result = await manager.open('confirm', { message: 'Are you sure?' });
    console.log('Confirm result:', result);
  };

  const handleOpenAlert = async () => {
    await manager.open('alert', {
      title: 'Info',
      message: 'This is an alert!',
    });
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Overlay Manager DevTools Test</h1>
      <p>
        Click the buttons below to open overlays, then use the DevTools to
        inspect them.
      </p>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={handleOpenConfirm}>Open Confirm Dialog</button>
        <button onClick={handleOpenAlert}>Open Alert Dialog</button>
      </div>

      <p>Use Ctrl+Shift+O to toggle DevTools, or click the floating button.</p>

      {/* DevTools - only renders in development */}
      <OverlayManagerDevtools manager={manager} />
    </div>
  );
}
