/**
 * Branded errors for better debugging and error messages.
 */

export class OverlayAlreadyOpenError extends Error {
  constructor(id: string) {
    const message = [
      `[react-overlay-manager] An overlay with the ID "${id}" is already open.`,
      `Each overlay must have a unique ID.`,
      `\nSolutions:`,
      `1. If this was intentional, close the existing overlay before opening a new one.`,
      `2. If this was a mistake, provide a different 'id' in manager.open(key, { id: 'unique-id' }).`,
      `3. Omit the 'id' option entirely to have a unique ID generated automatically.`,
    ].join('\n');
    super(message);
    this.name = 'OverlayAlreadyOpenError';
  }
}

export class OverlayNotFoundError extends Error {
  constructor(id: string) {
    super(
      `[react-overlay-manager] No overlay instance found with id "${id}". This can happen if the overlay is closed or removed before an operation completes.`
    );
    this.name = 'OverlayNotFoundError';
  }
}
