import type {
  AnyOverlayInstance,
  ComponentProps,
  OpenOptions,
  OverlayComponent,
  OverlayId,
  OverlayInstance,
  OverlayRegistry,
  OverlayResult,
  OverlayState,
  PromiseWithId,
  RegistryInstance,
  ResolveComponent,
  StackingBehavior,
} from '../types';
import { OverlayAlreadyOpenError, OverlayNotFoundError } from '../utils/errors';
import type { ManagerEvent } from './events.types';

type Selector<TRegistry extends OverlayRegistry, TSelected> = (
  state: OverlayState<TRegistry>
) => TSelected;

type Subscription<TRegistry extends OverlayRegistry> = {
  selector: Selector<TRegistry, any>;
  callback: () => void;
  lastValue: any;
};

/**
 * Per-open bookkeeping. A new record is created every time an overlay is
 * opened, so its identity marks one generation of an ID. Instance objects in
 * state are cloned on show/hide/update and cannot serve that purpose.
 */
type Lifecycle = {
  promise: PromiseWithId<any>;
  closed: boolean;
  exitTimeout?: ReturnType<typeof setTimeout>;
  // React key for this generation, so a reopened ID remounts its component
  renderKey: string;
};

// Gives OverlayManager the render keys without adding them to the public class
const lifecyclesByManager = new WeakMap<object, Map<OverlayId, Lifecycle>>();

/**
 * Returns the React key for the current generation of an overlay ID.
 * @internal
 */
export function getOverlayRenderKey(
  manager: OverlayManagerCore<any>,
  id: OverlayId
): string {
  return lifecyclesByManager.get(manager)?.get(id)?.renderKey ?? id;
}

/**
 * The internal, type-safe overlay manager implementation.
 * @internal
 */
export class OverlayManagerCore<TRegistry extends OverlayRegistry> {
  private state: OverlayState<TRegistry> = {
    instances: new Map(),
    overlayStack: [],
  };

  private listeners = new Set<(event: ManagerEvent<TRegistry>) => void>();
  private subscriptions = new Set<Subscription<TRegistry>>();
  private nextId = 0 as number;

  // Lifecycle of the current generation of each open ID
  private lifecycles = new Map<OverlayId, Lifecycle>();
  private nextGeneration = 0;

  public defaultExitDuration: number | null | undefined;

  /**
   * Global stacking behavior.
   * - 'hide-previous': opening a new overlay hides the one beneath it; removing the top shows previous.
   * - 'stack': overlays remain visible.
   * @default 'hide-previous'
   */
  public stackingBehavior: StackingBehavior = 'hide-previous';

  /**
   * Default portal target for all overlays. Safely initialized
   * to `document.body` on the client. Can be overridden by the
   * <OverlayManager portalTarget={...}/> component or per `open()` call.
   */
  public defaultPortalTarget: HTMLElement | null =
    typeof document !== 'undefined' ? document.body : null;

  public readonly registry: TRegistry;
  constructor(registry: TRegistry) {
    this.registry = registry;
    lifecyclesByManager.set(this, this.lifecycles);

    this.open = this.open.bind(this);
    this.hide = this.hide.bind(this);
    this.show = this.show.bind(this);
    this.update = this.update.bind(this);
    this.closeAll = this.closeAll.bind(this);
    this.getOpenCount = this.getOpenCount.bind(this);
    this.isOpen = this.isOpen.bind(this);
    this.getInstance = this.getInstance.bind(this);
    this.getInstancesByKey = this.getInstancesByKey.bind(this);
  }

  // --- Public API methods ---

  /**
   * Narrow this manager instance to a specific registry type for stronger typing in consumers.
   * This is a purely type-level assertion with no runtime cost.
   */
  public as<
    NewRegistry extends OverlayRegistry,
  >(): OverlayManagerCore<NewRegistry> {
    return this as unknown as OverlayManagerCore<NewRegistry>;
  }

  /**
   * Opens an overlay by its key in the registry or by passing the component directly.
   * This method uses conditional types to provide strict type-safety for the `options`
   * argument based on the first argument.
   *
   * @param keyOrComponent The key of the registered overlay or the component function itself.
   * @param options The props for the component, plus optional `id` and `exitDuration`.
   * @returns A promise that resolves with the overlay's result, with an `id` property attached.
   */
  public open<const T extends keyof TRegistry | OverlayComponent<any, any>>(
    keyOrComponent: T,
    ...args: object extends ComponentProps<ResolveComponent<T, TRegistry>>
      ? [options?: OpenOptions<ComponentProps<ResolveComponent<T, TRegistry>>>]
      : [options: OpenOptions<ComponentProps<ResolveComponent<T, TRegistry>>>]
  ): PromiseWithId<OverlayResult<ResolveComponent<T, TRegistry>>> {
    const options: OpenOptions<any> | undefined = args[0];
    const id = options?.id;

    // '' is a valid ID, so only null and undefined mean "no ID"
    if (id != null && this.state.instances.has(id)) {
      const instance = this.state.instances.get(id)!;

      const lifecycle = this.lifecycles.get(id)!;

      if (instance.visible) {
        throw new OverlayAlreadyOpenError(id);
      } else if (lifecycle.closed) {
        // The old promise has already resolved, so drop the exiting instance
        // and open a fresh one under the same ID. Starting over also covers a
        // REMOVE listener that reopened the ID in the meantime.
        this.remove(id);
        return this.open(keyOrComponent, ...args);
      } else {
        const newProps = this.stripInternalOptions(options);
        this.update(id, newProps);
        this.show(id);
        return lifecycle.promise;
      }
    }

    // Components are functions or objects (memo, forwardRef), so any property
    // key type, including symbols, 0 and '', is a registry lookup.
    if (
      typeof keyOrComponent === 'string' ||
      typeof keyOrComponent === 'number' ||
      typeof keyOrComponent === 'symbol'
    ) {
      const key = keyOrComponent as keyof TRegistry;
      const component = this.registry[key] as TRegistry[keyof TRegistry];
      return this._createAndAddInstance(
        component as OverlayComponent<any, any>,
        options,
        key
      ) as any;
    }
    return this._createAndAddInstance(
      keyOrComponent as OverlayComponent<any, any>,
      options
    ) as any;
  }

  public hide(id: OverlayId) {
    if (!this.state.instances.has(id)) {
      return;
    }
    const nextInstances = new Map(this.state.instances);
    const instance = nextInstances.get(id);
    if (instance) {
      const updated: AnyOverlayInstance<TRegistry> = {
        ...(instance as AnyOverlayInstance<TRegistry>),
        visible: false,
        isClosing: false,
      };
      nextInstances.set(id, updated);
      this.state = {
        instances: nextInstances,
        overlayStack: this.state.overlayStack,
      };
    }
    this.notifyListeners({ type: 'HIDE', id });
  }

  public show(id: OverlayId) {
    if (!this.state.instances.has(id)) {
      throw new OverlayNotFoundError(id);
    }
    const nextInstances = new Map(this.state.instances);
    const instance = nextInstances.get(id);
    if (instance) {
      const updated: AnyOverlayInstance<TRegistry> = {
        ...(instance as AnyOverlayInstance<TRegistry>),
        visible: true,
        isClosing: false,
      };
      nextInstances.set(id, updated);
      this.state = {
        instances: nextInstances,
        overlayStack: this.state.overlayStack,
      };
    }
    this.notifyListeners({ type: 'SHOW', id });
  }

  public update<P>(id: OverlayId, props: Partial<P>) {
    if (!this.state.instances.has(id)) {
      throw new OverlayNotFoundError(id);
    }
    const nextInstances = new Map(this.state.instances);
    const instance = nextInstances.get(id);
    if (instance) {
      const updated: AnyOverlayInstance<TRegistry> = {
        ...(instance as AnyOverlayInstance<TRegistry>),
        props: {
          ...(instance as AnyOverlayInstance<TRegistry>).props,
          ...props,
        },
      } as AnyOverlayInstance<TRegistry>;
      nextInstances.set(id, updated);
      this.state = {
        instances: nextInstances,
        overlayStack: this.state.overlayStack,
      };
    }
    this.notifyListeners({ type: 'UPDATE', id, props });
  }

  closeAll() {
    const instanceIds = Array.from(this.state.instances.keys());
    instanceIds.forEach((id) => {
      const instance = this.state.instances.get(id);
      if (instance) {
        instance.close();
      }
    });
  }

  getOpenCount(): number {
    return this.state.overlayStack.length;
  }

  isOpen(id: OverlayId): boolean {
    return this.state.instances.has(id);
  }

  getInstance(id: OverlayId): AnyOverlayInstance<TRegistry> | undefined {
    return this.state.instances.get(id);
  }

  getInstancesByKey<K extends keyof TRegistry>(
    key: K
  ): Array<RegistryInstance<TRegistry, K>> {
    const out: Array<RegistryInstance<TRegistry, K>> = [];
    for (const instance of this.state.instances.values()) {
      if (
        'key' in (instance as unknown as { key?: unknown }) &&
        (instance as RegistryInstance<TRegistry, K>).key === key
      ) {
        out.push(instance as RegistryInstance<TRegistry, K>);
      }
    }
    return out;
  }

  // --- React integration ---

  /**
   * Subscribes to all manager events. Used for simple listeners.
   * For React components, `subscribeWithSelector` is preferred for performance.
   */
  public subscribe = (listener: (event: ManagerEvent<TRegistry>) => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /**
   * Subscribes a callback to a selected slice of the state.
   * The callback is only invoked when the selected value changes.
   * This is the primary subscription method for `useOverlayStore`.
   */
  public subscribeWithSelector<TSelected>(
    selector: Selector<TRegistry, TSelected>,
    callback: () => void
  ): () => void {
    const subscription: Subscription<TRegistry> = {
      selector,
      callback,
      lastValue: selector(this.state),
    };

    this.subscriptions.add(subscription);

    return () => {
      this.subscriptions.delete(subscription);
    };
  }

  getState = () => this.state;

  // --- Private methods ---

  private _createAndAddInstance<P, R>(
    component: OverlayComponent<P, R>,
    options: OpenOptions<P> | undefined,
    key?: keyof TRegistry
  ): PromiseWithId<R> {
    const runtimeId = this.coerceOrCreateId(options?.id);

    // Determine stacking behavior for this open call (option overrides global)
    const behavior: StackingBehavior =
      (options as OpenOptions<unknown>)?.stackingBehavior ??
      this.stackingBehavior;

    // If hide-previous and something is on stack, capture the previous overlay id
    const previousOverlayId =
      behavior === 'hide-previous' && this.state.overlayStack.length > 0
        ? this.state.overlayStack[this.state.overlayStack.length - 1]
        : null;

    const portalTarget =
      options?.portalTarget === null
        ? null
        : (options?.portalTarget ?? this.defaultPortalTarget);

    let resolveFn!: (result: R) => void;
    const promise = new Promise<R>((resolve) => {
      resolveFn = resolve;
    });

    const promiseWithId = Object.assign(promise, { id: runtimeId });
    const lifecycle: Lifecycle = {
      promise: promiseWithId,
      closed: false,
      renderKey: String(this.nextGeneration++),
    };
    this.lifecycles.set(runtimeId, lifecycle);

    // Callbacks captured by this generation must not act on a later one
    const isCurrent = () => this.lifecycles.get(runtimeId) === lifecycle;

    const cleanProps = this.stripInternalOptions(options) as P;

    const instanceBase: OverlayInstance<P, R, TRegistry> = {
      id: runtimeId,
      component,
      props: { ...cleanProps, manager: this },
      visible: true,
      isClosing: false,
      portalTarget,
      stackingBehavior: behavior,
      manager: this,
      hide: () => {
        if (!isCurrent()) return;
        this.hide(runtimeId);
      },
      close: (result?: R) => {
        // Prevent duplicate close processing
        if (!isCurrent() || lifecycle.closed) return;

        lifecycle.closed = true;

        resolveFn(result as R);

        // Determine which previous overlay (if any) should be shown.
        // We intentionally skip any trailing overlays that are in the middle
        // of closing (not visible and awaiting removal), because relying on
        // them being removed via CSS events can leave them on the stack for a
        // short time. This ensures that closing an overlay always reveals the
        // nearest non-closing overlay beneath it.
        let previousOverlayIdToShow: OverlayId | null = null;
        if (behavior === 'hide-previous') {
          for (let i = this.state.overlayStack.length - 1; i >= 0; i--) {
            const candidateId = this.state.overlayStack[i];
            if (candidateId === runtimeId) {
              continue;
            }
            const candidate = this.state.instances.get(candidateId);
            if (!candidate) {
              continue;
            }
            if (candidate.isClosing) {
              // Skip overlays that are currently closing but not yet removed
              continue;
            }
            previousOverlayIdToShow = candidateId;
            break;
          }
        }

        // Update visibility states atomically (hide current, show previous if needed)
        const nextInstances = new Map(this.state.instances);
        const instanceToClose = nextInstances.get(runtimeId);
        if (instanceToClose) {
          nextInstances.set(runtimeId, {
            ...(instanceToClose as AnyOverlayInstance<TRegistry>),
            visible: false,
            isClosing: true,
          });
        }
        if (previousOverlayIdToShow !== null) {
          const instanceToShow = nextInstances.get(previousOverlayIdToShow);
          if (instanceToShow) {
            nextInstances.set(previousOverlayIdToShow, {
              ...(instanceToShow as AnyOverlayInstance<TRegistry>),
              visible: true,
            });
          }
        }
        this.state = {
          instances: nextInstances,
          overlayStack: this.state.overlayStack,
        };

        // Listeners run synchronously and may reopen this ID. Once a newer
        // generation exists, this close must not emit or remove anything else.
        this.notifyListeners({ type: 'HIDE', id: runtimeId });
        if (!isCurrent()) return;
        if (previousOverlayIdToShow !== null) {
          this.notifyListeners({ type: 'SHOW', id: previousOverlayIdToShow });
          if (!isCurrent()) return;
        }

        const localDuration = options?.exitDuration;
        const globalDuration = this.defaultExitDuration;

        let finalDuration: number | null | undefined;
        if (localDuration === null) {
          finalDuration = null; // Manual removal via onExitComplete
        } else if (localDuration !== undefined) {
          finalDuration = localDuration;
        } else {
          finalDuration = globalDuration;
        }

        if (typeof finalDuration === 'number') {
          if (finalDuration <= 0) {
            // Immediate removal
            this.remove(runtimeId);
          } else {
            lifecycle.exitTimeout = setTimeout(() => {
              lifecycle.exitTimeout = undefined;
              if (isCurrent()) {
                this.remove(runtimeId);
              }
            }, finalDuration);
          }
        }
      },
      onExitComplete: () => {
        // remove() also clears a pending exit timeout
        if (!isCurrent()) return;
        this.remove(runtimeId);
      },
    };

    const instance =
      key !== undefined ? Object.assign(instanceBase, { key }) : instanceBase;

    const nextInstances = new Map(this.state.instances);
    nextInstances.set(runtimeId, instance as AnyOverlayInstance<TRegistry>);
    if (previousOverlayId !== null) {
      const prev = nextInstances.get(previousOverlayId);
      if (prev) {
        nextInstances.set(previousOverlayId, {
          ...(prev as AnyOverlayInstance<TRegistry>),
          visible: false,
        });
      }
    }
    const nextStack = [...this.state.overlayStack, runtimeId];
    this.state = { instances: nextInstances, overlayStack: nextStack };

    this.notifyListeners({ type: 'OPEN', id: runtimeId, key, component });
    if (previousOverlayId !== null) {
      this.notifyListeners({ type: 'HIDE', id: previousOverlayId });
    }

    return promiseWithId;
  }

  private remove(id: OverlayId) {
    if (!this.state.instances.has(id)) {
      return;
    }

    // Clear any pending exit timeout and end this generation
    const lifecycle = this.lifecycles.get(id);
    if (lifecycle?.exitTimeout) {
      clearTimeout(lifecycle.exitTimeout);
      lifecycle.exitTimeout = undefined;
    }
    this.lifecycles.delete(id);

    const nextInstances = new Map(this.state.instances);
    nextInstances.delete(id);
    const nextStack = this.state.overlayStack.filter((i) => i !== id);
    this.state = { instances: nextInstances, overlayStack: nextStack };

    this.notifyListeners({ type: 'REMOVE', id });
  }

  private createOverlayId(next: number): OverlayId {
    return `overlay_${next}` as OverlayId;
  }

  private generateId(): OverlayId {
    // Skip values already taken by explicit IDs
    let id: OverlayId;
    do {
      id = this.createOverlayId(this.nextId);
      this.nextId += 1;
    } while (this.state.instances.has(id));
    return id;
  }

  private coerceOrCreateId(id?: OverlayId): OverlayId {
    return id ?? this.generateId();
  }

  private stripInternalOptions<P>(props: OpenOptions<P> | undefined): P {
    if (!props) return {} as P;
    const rest = { ...(props as Record<string, unknown>) };
    delete (rest as { id?: OverlayId }).id;
    delete (rest as { exitDuration?: number | null }).exitDuration;
    delete (rest as { portalTarget?: Element | null }).portalTarget;
    delete (rest as { stackingBehavior?: StackingBehavior }).stackingBehavior;
    return rest as P;
  }

  private notifySubscribers() {
    for (const sub of this.subscriptions) {
      try {
        const newValue = sub.selector(this.state);
        if (!Object.is(newValue, sub.lastValue)) {
          sub.lastValue = newValue;
          sub.callback();
        }
      } catch (error) {
        console.error(
          '[react-overlay-manager] A selector threw an error:',
          error
        );
      }
    }
  }

  private notifyListeners(event: ManagerEvent<TRegistry>) {
    this.listeners.forEach((listener) => listener(event));
    this.notifySubscribers();
  }
}
