import { isValidElement } from 'react';
import { OverlayManagerCore } from '@react-overlay-manager/core';

const MAX_DEPTH = 8;
const MAX_ENTRIES = 100;
const MAX_NODES = 2000;

interface InspectOptions {
  /** The manager injected into overlay props. It is shown as a placeholder. */
  manager?: unknown;
  pretty?: boolean;
}

/**
 * Formats overlay props as JSON for display and copying.
 * Values that JSON cannot represent (BigInt, functions, cycles, React elements,
 * managers, throwing getters) become descriptive strings instead of throwing.
 */
export function formatProps(
  props: unknown,
  { manager, pretty = true }: InspectOptions = {}
): string {
  let nodes = 0;
  const ancestors: object[] = [];

  const describeError = (error: unknown) =>
    `[Threw: ${error instanceof Error ? error.message : String(error)}]`;

  const toInspectable = (value: unknown, depth: number): unknown => {
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
    if (depth >= MAX_DEPTH || ++nodes > MAX_NODES) {
      return Array.isArray(obj) ? `[Array(${obj.length})]` : '[Object]';
    }

    ancestors.push(obj);
    try {
      if (typeof (obj as { toJSON?: unknown }).toJSON === 'function') {
        return toInspectable(
          (obj as { toJSON: () => unknown }).toJSON(),
          depth
        );
      }
      if (obj instanceof Map) {
        return { '[Map]': mapEntries([...obj.entries()], depth) };
      }
      if (obj instanceof Set) {
        return { '[Set]': mapEntries([...obj.values()], depth) };
      }
      if (Array.isArray(obj)) return mapEntries(obj, depth);

      const result: Record<string, unknown> = {};
      const keys = Object.keys(obj);
      for (const key of keys.slice(0, MAX_ENTRIES)) {
        try {
          result[key] = toInspectable(
            (obj as Record<string, unknown>)[key],
            depth + 1
          );
        } catch (error) {
          result[key] = describeError(error);
        }
      }
      if (keys.length > MAX_ENTRIES) {
        result['[truncated]'] = `${keys.length - MAX_ENTRIES} more keys`;
      }
      return result;
    } catch (error) {
      return describeError(error);
    } finally {
      ancestors.pop();
    }
  };

  const mapEntries = (items: unknown[], depth: number): unknown[] => {
    const result = items
      .slice(0, MAX_ENTRIES)
      .map((item) => toInspectable(item, depth + 1));
    if (items.length > MAX_ENTRIES) {
      result.push(`[${items.length - MAX_ENTRIES} more items]`);
    }
    return result;
  };

  return JSON.stringify(toInspectable(props, 0), null, pretty ? 2 : undefined);
}
