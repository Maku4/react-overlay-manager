import { isValidElement } from 'react';
import { OverlayManagerCore } from '@react-overlay-manager/core';

interface InspectOptions {
  /** The manager injected into overlay props. It is shown as a placeholder. */
  manager?: unknown;
  pretty?: boolean;
}

/**
 * Formats overlay props as JSON for display and copying.
 * JSON-compatible data is kept in full. Values that JSON cannot represent
 * (BigInt, functions, cycles, React elements, managers, throwing getters)
 * become descriptive strings instead of throwing.
 */
export function formatProps(
  props: unknown,
  { manager, pretty = true }: InspectOptions = {}
): string {
  const ancestors: object[] = [];

  const describeError = (error: unknown) =>
    `[Threw: ${error instanceof Error ? error.message : String(error)}]`;

  const toInspectable = (value: unknown): unknown => {
    switch (typeof value) {
      case 'bigint':
        return `${value}n`;
      case 'number':
        return Number.isFinite(value) ? value : String(value);
      case 'undefined':
        return '[undefined]';
      case 'symbol':
        return value.toString();
      case 'function':
        return `[Function ${value.name || 'anonymous'}]`;
      case 'string':
      case 'boolean':
        return value;
    }
    if (value === null) return null;

    const obj = value as object;
    if (obj === manager || obj instanceof OverlayManagerCore) {
      return '[OverlayManager]';
    }
    if (isValidElement(obj)) {
      const type = obj.type as string | { displayName?: string; name?: string };
      const name =
        typeof type === 'string'
          ? type
          : type?.displayName || type?.name || 'Component';
      return `[ReactElement <${name}>]`;
    }
    if (typeof Node !== 'undefined' && obj instanceof Node) {
      return `[${obj.constructor.name} ${obj.nodeName.toLowerCase()}]`;
    }
    if (obj instanceof Date) {
      return Number.isNaN(obj.getTime()) ? '[Invalid Date]' : obj.toISOString();
    }
    if (obj instanceof Error) return `[${obj.name}: ${obj.message}]`;
    if (ancestors.includes(obj)) return '[Circular]';

    ancestors.push(obj);
    try {
      if (typeof (obj as { toJSON?: unknown }).toJSON === 'function') {
        return toInspectable((obj as { toJSON: () => unknown }).toJSON());
      }
      if (obj instanceof Map) {
        return { '[Map]': [...obj.entries()].map(toInspectable) };
      }
      if (obj instanceof Set) {
        return { '[Set]': [...obj.values()].map(toInspectable) };
      }
      if (Array.isArray(obj)) return obj.map(toInspectable);

      // A null prototype keeps own keys such as "__proto__" as plain data.
      const result: Record<string, unknown> = Object.create(null);
      for (const key of Object.keys(obj)) {
        try {
          result[key] = toInspectable((obj as Record<string, unknown>)[key]);
        } catch (error) {
          result[key] = describeError(error);
        }
      }
      return result;
    } catch (error) {
      return describeError(error);
    } finally {
      ancestors.pop();
    }
  };

  try {
    return JSON.stringify(toInspectable(props), null, pretty ? 2 : undefined);
  } catch (error) {
    // Extremely deep data can still exceed the call stack.
    return JSON.stringify(describeError(error));
  }
}
