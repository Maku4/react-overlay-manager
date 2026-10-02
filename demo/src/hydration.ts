// Recoverable errors reported by hydrateRoot, shown in the page header.
const HYDRATION_ERROR_EVENT = 'demo:hydration-error';

export const hydrationErrors: unknown[] = [];

export function recordHydrationError(error: unknown) {
  hydrationErrors.push(error);
  console.error('Hydration error:', error);
  window.dispatchEvent(new Event(HYDRATION_ERROR_EVENT));
}

export function subscribeToHydrationErrors(onChange: () => void) {
  window.addEventListener(HYDRATION_ERROR_EVENT, onChange);
  return () => window.removeEventListener(HYDRATION_ERROR_EVENT, onChange);
}
