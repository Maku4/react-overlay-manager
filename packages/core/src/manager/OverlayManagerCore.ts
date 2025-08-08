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

  private promises = new Map<OverlayId, PromiseWithId<any>>();

  // Track per-instance pending exit timeout to allow clearing when onExitComplete is called earlier
  private exitTimeouts = new Map<OverlayId, ReturnType<typeof setTimeout>>();
  // Track if close() was already invoked to avoid duplicate flows
  private closedOnce = new Set<OverlayId>();

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

    if (id && this.state.instances.has(id)) {
      const instance = this.state.instances.get(id)!;

      if (instance.visible) {
        throw new OverlayAlreadyOpenError(id);
      } else {
        const newProps = this.stripInternalOptions(options);
        this.update(id, newProps);
        this.show(id);
        return this.promises.get(id) as PromiseWithId<any>;
      }
    }

    if (
      typeof keyOrComponent === 'string' ||
      typeof keyOrComponent === 'number'
    ) {
      const key = keyOrComponent as keyof TRegistry;
      const component = this.registry[key] as OverlayComponent<any, any>;
      return this._createAndAddInstance(component, options, key) as any;
    } else {
      const component = keyOrComponent as OverlayComponent<any, any>;
      return this._createAndAddInstance(component, options) as any;
    }
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
    this.promises.set(runtimeId, promiseWithId);

    const cleanProps = this.stripInternalOptions(options) as P;

    const instanceBase: OverlayInstance<P, R> = {
      id: runtimeId,
      component,
      props: cleanProps,
      visible: true,
      isClosing: false,
      portalTarget,
      stackingBehavior: behavior,
      hide: () => {
        this.hide(runtimeId);
      },
      close: (result?: R) => {
        // Prevent duplicate close processing
        if (this.closedOnce.has(runtimeId)) return;
        if (!this.state.instances.has(runtimeId)) return;

        this.closedOnce.add(runtimeId);

        resolveFn(result as R);

        // Check if this is the topmost overlay and find previous to show
        const isTopmost =
          this.state.overlayStack.length > 0 &&
          this.state.overlayStack[this.state.overlayStack.length - 1] ===
            runtimeId;

        const previousOverlayIdToShow =
          behavior === 'hide-previous' &&
          isTopmost &&
          this.state.overlayStack.length > 1
            ? this.state.overlayStack[this.state.overlayStack.length - 2]
            : null;

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
        if (previousOverlayIdToShow) {
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

        this.notifyListeners({ type: 'HIDE', id: runtimeId });
        if (previousOverlayIdToShow) {
          this.notifyListeners({ type: 'SHOW', id: previousOverlayIdToShow });
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

        // Clear any previous pending timeout just in case
        const prev = this.exitTimeouts.get(runtimeId);
        if (prev) {
          clearTimeout(prev);
          this.exitTimeouts.delete(runtimeId);
        }

        if (typeof finalDuration === 'number') {
          if (finalDuration <= 0) {
            // Immediate removal
            if (this.state.instances.has(runtimeId)) {
              this.remove(runtimeId);
            }
          } else {
            const handle = setTimeout(() => {
              this.exitTimeouts.delete(runtimeId);
              if (this.state.instances.has(runtimeId)) {
                this.remove(runtimeId);
              }
            }, finalDuration);
            this.exitTimeouts.set(runtimeId, handle);
          }
        }
      },
      onExitComplete: () => {
        // If an auto-timeout is pending, clear it and remove immediately
        const pending = this.exitTimeouts.get(runtimeId);
        if (pending) {
          clearTimeout(pending);
          this.exitTimeouts.delete(runtimeId);
        }
        if (this.state.instances.has(runtimeId)) {
          this.remove(runtimeId);
        }
      },
    };

    const instance = key ? Object.assign(instanceBase, { key }) : instanceBase;

    const nextInstances = new Map(this.state.instances);
    nextInstances.set(runtimeId, instance as AnyOverlayInstance<TRegistry>);
    if (previousOverlayId) {
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
    if (previousOverlayId) {
      this.notifyListeners({ type: 'HIDE', id: previousOverlayId });
    }

    return promiseWithId;
  }

  private remove(id: OverlayId) {
    if (!this.state.instances.has(id)) {
      return;
    }

    // Clear any pending exit timeout and closed flag
    const t = this.exitTimeouts.get(id);
    if (t) {
      clearTimeout(t);
      this.exitTimeouts.delete(id);
    }
    this.closedOnce.delete(id);

    this.promises.delete(id);
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
    const id = this.createOverlayId(this.nextId);
    this.nextId += 1;
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
