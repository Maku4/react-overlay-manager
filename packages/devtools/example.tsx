import {
  createOverlayManager,
  defineOverlay,
  OverlayComponent,
} from 'react-overlay-manager';
import { OverlayManagerDevtools } from './src/index';

interface ConfirmDialogProps {
  message: string;
}

const ConfirmDialog: OverlayComponent<ConfirmDialogProps, boolean> = ({
  message,
  close,
}) => (
  <div
    style={{
      padding: '20px',
      backgroundColor: 'white',
      border: '1px solid #ccc',
    }}
  >
    <p>{message}</p>
    <button onClick={() => close(true)}>Yes</button>
    <button onClick={() => close(false)}>No</button>
  </div>
);

interface AlertDialogProps {
  title: string;
  message: string;
}

const AlertDialog = defineOverlay<AlertDialogProps, void>(
  ({ title, message, close }) => (
    <div
      style={{
        padding: '20px',
        backgroundColor: 'white',
        border: '1px solid #ccc',
      }}
    >
      <h3>{title}</h3>
      <p>{message}</p>
      <button onClick={() => close()}>OK</button>
    </div>
  )
);

interface NoRegistryDialogProps {
  title: string;
  message: string;
}

interface NoRegistryDialogResult {
  user: string;
}

const NoRegistryDialog = defineOverlay<
  NoRegistryDialogProps,
  NoRegistryDialogResult
>(({ title, message, close }) => (
  <div>
    <h3>{title}</h3>
    <p>{message}</p>
    <button onClick={() => close({ user: 'ok' })}>OK</button>
  </div>
));

// Create overlay registry
const overlayRegistry = {
  confirm: ConfirmDialog,
  alert: AlertDialog,
} as const;

// Create manager
const manager = createOverlayManager(overlayRegistry);

// Example usage
export function ExampleApp() {
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

  // or directly
  const handleOpenAlert2 = async () => {
    const result = await manager.open(NoRegistryDialog, {
      title: 'Info',
      message: 'This is an alert!',
    });
    console.log('NoRegistryDialog result:', result);
  };

  return (
    <div>
      <h1>Overlay Manager DevTools Example</h1>
      <button onClick={handleOpenConfirm}>Open Confirm Dialog</button>
      <button onClick={handleOpenAlert}>Open Alert Dialog</button>
      <button onClick={handleOpenAlert2}>Open Alert Dialog 2</button>

      {/* DevTools - only renders in development */}
      <OverlayManagerDevtools manager={manager} />
    </div>
  );
}
