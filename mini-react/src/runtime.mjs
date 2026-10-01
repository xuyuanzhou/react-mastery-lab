import { FRAGMENT, SUSPENSE, TEXT, normalizeChildren } from "./element.mjs";
import {
  NoLane,
  SyncLane,
  TransitionLane,
  enqueue,
  processQueue,
} from "./queue.mjs";
import { createJsonHost } from "./host.mjs";

const Placement = 1;
const Update = 2;
const Deletion = 4;
let renderingFiber = null;
let currentHook = null;
let lastHook = null;

function sameDeps(previous, next) {
  return (
    Array.isArray(previous) &&
    Array.isArray(next) &&
    previous.length === next.length &&
    previous.every((value, index) => Object.is(value, next[index]))
  );
}

function appendHook(hook) {
  if (lastHook) lastHook.next = hook;
  else renderingFiber.memoizedState = hook;
  lastHook = hook;
  if (currentHook) currentHook = currentHook.next;
}

export function useState(initial) {
  if (!renderingFiber) throw new Error("useState 只能在函数组件 Render 中调用");
  const old = currentHook;
  if (old && old.kind !== "state") throw new Error("Hook 调用顺序改变");
  const queue = old?.queue ?? { pending: null };
  const result = old
    ? processQueue(
        old.baseState,
        old.baseQueue,
        queue.pending,
        renderingFiber.root.renderLanes,
      )
    : (() => {
        const initialState =
          typeof initial === "function" ? initial() : initial;
        return {
          memoizedState: initialState,
          baseState: initialState,
          baseQueue: null,
        };
      })();
  const hook = {
    kind: "state",
    ...result,
    queue,
    next: null,
  };
  appendHook(hook);
  const root = renderingFiber.root;
  const dispatch = (action, lane = SyncLane) => {
    enqueue(queue, action, lane);
    root.pendingLanes |= lane;
  };
  return [hook.memoizedState, dispatch];
}

function useEffectImpl(kind, create, deps) {
  if (!renderingFiber) throw new Error("Effect 只能在函数组件 Render 中声明");
  const old = currentHook;
  if (old && old.kind !== kind) throw new Error("Hook 调用顺序改变");
  const changed = !old || !sameDeps(old.deps, deps);
  const hook = {
    kind,
    create,
    deps,
    cleanup: old?.cleanup ?? null,
    changed,
    next: null,
  };
  appendHook(hook);
  if (changed) renderingFiber.effects.push(hook);
}

export function useEffect(create, deps) {
  useEffectImpl("passive", create, deps);
}

export function createContext(defaultValue) {
  const context = { defaultValue };
  context.Provider = { kind: "Provider", context };
  return context;
}

export function useContext(context) {
  if (!renderingFiber) throw new Error("useContext 只能在 Render 中调用");
  for (let parent = renderingFiber.return; parent; parent = parent.return) {
    if (parent.tag === "Provider" && parent.type.context === context) {
      return parent.pendingProps.value;
    }
  }
  return context.defaultValue;
}

export function createResource(promise) {
  const resource = { status: "pending", value: undefined, thenable: promise };
  Promise.resolve(promise).then(
    (value) => {
      resource.status = "fulfilled";
      resource.value = value;
    },
    (error) => {
      resource.status = "rejected";
      resource.value = error;
    },
  );
  return resource;
}

export function readResource(resource) {
  if (resource.status === "fulfilled") return resource.value;
  if (resource.status === "rejected") throw resource.value;
  throw { kind: "MiniSuspension", thenable: resource.thenable };
}

export function useLayoutEffect(create, deps) {
  useEffectImpl("layout", create, deps);
}

function fiberFor(element, parent, old, index) {
  const type = element.type;
  const tag =
    type === TEXT
      ? "Text"
      : type === FRAGMENT
        ? "Fragment"
        : type === SUSPENSE
          ? "Suspense"
          : type?.kind === "Provider"
            ? "Provider"
            : typeof type === "function"
              ? "Function"
              : "Host";
  return {
    tag,
    type,
    key: element.key,
    index,
    pendingProps: element.props,
    memoizedProps: old?.memoizedProps ?? null,
    memoizedState: null,
    stateNode: old?.stateNode ?? null,
    child: null,
    sibling: null,
    return: parent,
    alternate: old ?? null,
    flags: old ? (old.memoizedProps === element.props ? 0 : Update) : Placement,
    effects: [],
    deletions: [],
    root: parent.root,
  };
}

function reconcileChildren(parent, input) {
  const elements = normalizeChildren(input);
  const previous = new Map();
  let old = parent.alternate?.child ?? null;
  while (old) {
    previous.set(old.key ?? `@${old.index}`, old);
    old = old.sibling;
  }
  let last = null;
  elements.forEach((element, index) => {
    const identity = element.key ?? `@${index}`;
    const candidate = previous.get(identity);
    const matched = candidate?.type === element.type ? candidate : null;
    if (matched) previous.delete(identity);
    const fiber = fiberFor(element, parent, matched, index);
    if (last) last.sibling = fiber;
    else parent.child = fiber;
    last = fiber;
  });
  parent.deletions = [...previous.values()];
  if (parent.deletions.length) parent.flags |= Deletion;
}

function beginWork(fiber) {
  fiber.root.trace.push(
    `begin ${fiber.tag}${fiber.key ? `:${fiber.key}` : ""}`,
  );
  if (fiber.tag === "Root") {
    reconcileChildren(fiber, fiber.root.element);
  } else if (fiber.tag === "Function") {
    renderingFiber = fiber;
    currentHook = fiber.alternate?.memoizedState ?? null;
    lastHook = null;
    let children;
    try {
      children = fiber.type(fiber.pendingProps);
      if (currentHook) throw new Error("Hook 数量比上次更少");
    } finally {
      renderingFiber = null;
      currentHook = null;
      lastHook = null;
    }
    reconcileChildren(fiber, children);
  } else if (
    fiber.tag === "Host" ||
    fiber.tag === "Fragment" ||
    fiber.tag === "Provider" ||
    fiber.tag === "Suspense"
  ) {
    reconcileChildren(fiber, fiber.pendingProps.children);
  }
  return fiber.child;
}

function completeWork(fiber) {
  if ((fiber.tag === "Host" || fiber.tag === "Text") && !fiber.stateNode) {
    fiber.stateNode = fiber.root.host.create(
      fiber.tag === "Text" ? "#text" : fiber.type,
      fiber.pendingProps,
    );
  }
  fiber.memoizedProps = fiber.pendingProps;
  fiber.root.trace.push(
    `complete ${fiber.tag}${fiber.key ? `:${fiber.key}` : ""}`,
  );
}

function performUnitOfWork(fiber) {
  const child = beginWork(fiber);
  if (child) return child;
  let node = fiber;
  while (node) {
    completeWork(node);
    if (node.sibling) return node.sibling;
    node = node.return;
  }
  return null;
}

function visit(fiber, callback) {
  if (!fiber) return;
  callback(fiber);
  for (let child = fiber.child; child; child = child.sibling)
    visit(child, callback);
}

function cleanupDeleted(fiber) {
  visit(fiber, (node) => {
    for (let hook = node.memoizedState; hook; hook = hook.next) {
      if (typeof hook.cleanup === "function") hook.cleanup();
    }
  });
}

function collectHostChildren(parent, host) {
  const children = [];
  for (let fiber = parent.child; fiber; fiber = fiber.sibling) {
    const nested = collectHostChildren(fiber, host);
    if (fiber.tag === "Host" || fiber.tag === "Text") {
      host.update(
        fiber.stateNode,
        fiber.tag === "Text" ? "#text" : fiber.type,
        fiber.pendingProps,
        nested,
      );
      children.push(fiber.stateNode);
    } else children.push(...nested);
  }
  return children;
}

function runEffects(root, kind) {
  visit(root, (fiber) => {
    for (const effect of fiber.effects) {
      if (effect.kind !== kind) continue;
      if (typeof effect.cleanup === "function") effect.cleanup();
      const cleanup = effect.create();
      effect.cleanup = typeof cleanup === "function" ? cleanup : null;
    }
  });
}

function commitRoot(root) {
  visit(root.wip, (fiber) => fiber.deletions.forEach(cleanupDeleted));
  const children = collectHostChildren(root.wip, root.host);
  root.host.replace(children); // 唯一向外公布候选树的位置。
  runEffects(root.wip, "layout");
  runEffects(root.wip, "passive");
  visit(root.wip, (fiber) => {
    for (let hook = fiber.memoizedState; hook; hook = hook.next) {
      if (hook.kind === "state") hook.queue.pending = null;
    }
    if (fiber.alternate) fiber.alternate.alternate = fiber;
  });
  root.current = root.wip;
  root.pendingLanes &= ~root.renderLanes;
  root.trace.push("commit root");
  root.wip = null;
  root.nextUnit = null;
  root.renderLanes = NoLane;
}

export function createRoot(host = createJsonHost()) {
  const root = {
    host,
    element: null,
    current: null,
    wip: null,
    nextUnit: null,
    pendingLanes: NoLane,
    renderLanes: NoLane,
    trace: [],
    render(element, lane = SyncLane) {
      this.element = element;
      this.pendingLanes |= lane;
    },
    flush({ lane, maxUnits = Infinity } = {}) {
      const selected =
        lane ?? (this.pendingLanes & SyncLane ? SyncLane : TransitionLane);
      if (selected === NoLane || !(this.pendingLanes & selected)) {
        return { completed: true, units: 0, trace: [...this.trace] };
      }
      if (!this.wip || this.renderLanes !== selected) {
        this.renderLanes = selected;
        this.wip = {
          tag: "Root",
          type: null,
          key: null,
          index: 0,
          pendingProps: {},
          memoizedProps: null,
          memoizedState: null,
          stateNode: host.container,
          child: null,
          sibling: null,
          return: null,
          alternate: this.current,
          flags: 0,
          effects: [],
          deletions: [],
          root: this,
        };
        this.nextUnit = this.wip;
        this.trace = [];
      }
      let units = 0;
      const started = performance.now();
      try {
        while (this.nextUnit && units < maxUnits) {
          try {
            this.nextUnit = performUnitOfWork(this.nextUnit);
            units++;
          } catch (error) {
            if (error?.kind !== "MiniSuspension") throw error;
            let boundary = this.nextUnit.return;
            while (
              boundary &&
              (boundary.tag !== "Suspense" || boundary.suspended)
            ) {
              boundary = boundary.return;
            }
            if (!boundary)
              throw new Error("缺少可捕获的 Suspense 边界", { cause: error });
            boundary.suspended = true;
            this.trace.push("suspend → fallback");
            reconcileChildren(boundary, boundary.pendingProps.fallback);
            this.nextUnit = boundary.child;
            Promise.resolve(error.thenable).then(
              () => {
                this.pendingLanes |= TransitionLane;
              },
              () => {
                this.pendingLanes |= TransitionLane;
              },
            );
          }
        }
        if (!this.nextUnit) commitRoot(this);
      } catch (error) {
        this.wip = null;
        this.nextUnit = null;
        this.renderLanes = NoLane;
        throw error;
      }
      return {
        completed: !this.wip,
        units,
        durationMs: performance.now() - started,
        trace: [...this.trace],
      };
    },
    runAsync({ maxUnitsPerSlice = 50, onYield } = {}) {
      if (!Number.isInteger(maxUnitsPerSlice) || maxUnitsPerSlice < 1) {
        throw new RangeError("maxUnitsPerSlice 必须是正整数");
      }
      return new Promise((resolve, reject) => {
        const channel = new MessageChannel();
        const close = () => {
          channel.port1.close();
          channel.port2.close();
        };
        channel.port1.onmessage = () => {
          try {
            const result = this.flush({ maxUnits: maxUnitsPerSlice });
            if (!result.completed || this.pendingLanes) {
              onYield?.(result);
              channel.port2.postMessage(null);
            } else {
              close();
              resolve(result);
            }
          } catch (error) {
            close();
            reject(error);
          }
        };
        channel.port2.postMessage(null);
      });
    },
    snapshot() {
      return host.snapshot();
    },
  };
  root.current = {
    tag: "Root",
    type: null,
    key: null,
    index: 0,
    child: null,
    sibling: null,
    memoizedState: null,
    stateNode: host.container,
    alternate: null,
    root,
  };
  return root;
}
