import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface DialogProps {
  title: string;
  visible: boolean;
  onDismiss: () => void;
  children: ReactNode;
}

/**
 * Modal dialog markup with focus handling. The overlay manager does not move,
 * trap or restore focus, so this component does it:
 * - focuses the element marked `data-autofocus` when the dialog is shown,
 * - keeps Tab and Shift+Tab inside the dialog,
 * - closes on Escape,
 * - returns focus to the previously focused element when hidden or closed.
 */
export function Dialog({ title, visible, onDismiss, children }: DialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current!;
    // Hidden overlays stay mounted, so remove them from the tab order.
    dialog.inert = !visible;
    if (!visible) return;

    const active = document.activeElement;
    // Skip elements in overlays that were just hidden, such as a closing
    // confirmation that revealed this dialog again.
    if (
      active instanceof HTMLElement &&
      active !== document.body &&
      !dialog.contains(active) &&
      !active.closest('[aria-hidden="true"], [inert]')
    ) {
      returnFocusRef.current = active;
    }
    (
      dialog.querySelector<HTMLElement>('[data-autofocus]') ??
      dialog.querySelector<HTMLElement>(FOCUSABLE) ??
      dialog
    ).focus();

    return () => {
      const target = returnFocusRef.current;
      if (
        dialog.contains(document.activeElement) &&
        target?.isConnected &&
        !target.closest('[inert]')
      ) {
        target.focus();
      }
    };
  }, [visible]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onDismiss();
      return;
    }
    if (event.key !== 'Tab') return;

    const dialog = dialogRef.current!;
    const items = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (items.length === 0) {
      event.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === dialog)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className={visible ? 'backdrop is-visible' : 'backdrop'}>
      <div
        ref={dialogRef}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        <h2 id={titleId}>{title}</h2>
        {children}
      </div>
    </div>
  );
}
