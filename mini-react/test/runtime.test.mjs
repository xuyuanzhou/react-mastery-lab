import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import {
  createElement as h,
  createRoot,
  createDomHost,
  useEffect,
  useState,
  useContext,
  createContext,
  createResource,
  readResource,
  SUSPENSE,
  SyncLane,
  TransitionLane,
  enqueue,
  processQueue,
  queueToArray,
} from "../src/index.mjs";

test("Element 是描述；key 不进入 props，文本在 Commit 后才出现", () => {
  const root = createRoot();
  const element = h("p", { key: "one", title: "hello" }, "Hi ", 3);
  assert.equal(element.key, "one");
  assert.equal(element.props.key, undefined);
  root.render(element);
  assert.deepEqual(root.snapshot(), []);
  const partial = root.flush({ maxUnits: 1 });
  assert.equal(partial.completed, false);
  assert.deepEqual(root.snapshot(), []);
  root.flush();
  assert.deepEqual(root.snapshot(), [
    {
      type: "p",
      props: { title: "hello" },
      children: [{ text: "Hi " }, { text: "3" }],
    },
  ]);
});

test("同一 Reconciler 可以把提交结果写到真实 DOM Host", () => {
  const dom = new JSDOM('<main id="app"></main>');
  const container = dom.window.document.querySelector("#app");
  const root = createRoot(createDomHost(container));
  root.render(h("p", { className: "message" }, "first"));
  root.flush({ maxUnits: 1 });
  assert.equal(container.innerHTML, "");
  root.flush();
  assert.equal(container.innerHTML, '<p class="message">first</p>');
  root.render(h("p", { className: "message" }, "second"));
  root.flush();
  assert.equal(container.innerHTML, '<p class="message">second</p>');
});

test("同一 Hook 的环形队列跳过低优先级后按原顺序重放", () => {
  const queue = { pending: null };
  enqueue(queue, (n) => n + 10, TransitionLane);
  enqueue(queue, (n) => n * 2, SyncLane);
  assert.equal(queueToArray(queue.pending).length, 2);
  const first = processQueue(1, null, queue.pending, SyncLane);
  assert.equal(first.memoizedState, 2);
  assert.equal(first.baseState, 1);
  assert.deepEqual(
    queueToArray(first.baseQueue).map((update) => update.lane),
    [TransitionLane, 0],
  );
  const replay = processQueue(
    first.baseState,
    first.baseQueue,
    null,
    TransitionLane,
  );
  assert.equal(replay.memoizedState, 22);
});

test("Hook state 属于相同 type/key 的 Fiber；换 key 后重置", () => {
  let set;
  function Counter() {
    const [n, dispatch] = useState(0);
    set = dispatch;
    return h("span", null, n);
  }
  const root = createRoot();
  root.render(h(Counter, { key: "A" }));
  root.flush();
  set((n) => n + 1);
  root.flush();
  assert.equal(root.snapshot()[0].children[0].text, "1");
  root.render(h(Counter, { key: "A" }));
  root.flush();
  assert.equal(root.snapshot()[0].children[0].text, "1");
  root.render(h(Counter, { key: "B" }));
  root.flush();
  assert.equal(root.snapshot()[0].children[0].text, "0");
});

test("useState 的惰性初值只在挂载时计算", () => {
  let initializations = 0;
  let set;
  function Counter() {
    const [n, dispatch] = useState(() => {
      initializations++;
      return 1;
    });
    set = dispatch;
    return h("span", null, n);
  }
  const root = createRoot();
  root.render(h(Counter));
  root.flush();
  set((n) => n + 1);
  root.flush();
  assert.equal(initializations, 1);
  assert.equal(root.snapshot()[0].children[0].text, "2");
});

test("低优先级候选 Render 可暂停，高优先级工作可重启", () => {
  let set;
  function Counter() {
    const [n, dispatch] = useState(1);
    set = dispatch;
    return h("span", null, n);
  }
  const root = createRoot();
  root.render(h(Counter));
  root.flush();
  set((n) => n + 10, TransitionLane);
  const paused = root.flush({ lane: TransitionLane, maxUnits: 1 });
  assert.equal(paused.completed, false);
  assert.equal(root.snapshot()[0].children[0].text, "1");
  set((n) => n * 2, SyncLane);
  root.flush({ lane: SyncLane });
  assert.equal(root.snapshot()[0].children[0].text, "2");
  root.flush({ lane: TransitionLane });
  assert.equal(root.snapshot()[0].children[0].text, "22");
});

test("MessageChannel 把工作拆成多段，并在片段间处理更高优先级更新", async () => {
  let set;
  function Counter() {
    const [n, dispatch] = useState(1);
    set = dispatch;
    return h("span", null, n);
  }
  const root = createRoot();
  root.render(h(Counter));
  root.flush();
  set((n) => n + 10, TransitionLane);
  let yields = 0;
  await root.runAsync({
    maxUnitsPerSlice: 1,
    onYield: () => {
      yields++;
      if (yields === 1) {
        assert.equal(root.snapshot()[0].children[0].text, "1");
        set((n) => n * 2, SyncLane);
      }
    },
  });
  assert.ok(yields > 1);
  assert.equal(root.snapshot()[0].children[0].text, "22");
});

test("Render 抛错不污染已提交树", () => {
  function Crash({ fail }) {
    if (fail) throw new Error("render failed");
    return h("p", null, "old");
  }
  const root = createRoot();
  root.render(h(Crash, { fail: false }));
  root.flush();
  const before = root.snapshot();
  root.render(h(Crash, { fail: true }));
  assert.throws(() => root.flush(), /render failed/);
  assert.deepEqual(root.snapshot(), before);
});

test("Effect 只在 Commit 后执行；更新先清理，删除再清理", () => {
  const log = [];
  function Subscription({ room }) {
    useEffect(() => {
      log.push(`connect ${room}`);
      return () => log.push(`disconnect ${room}`);
    }, [room]);
    return h("p", null, room);
  }
  const root = createRoot();
  root.render(h(Subscription, { room: "A" }));
  root.flush({ maxUnits: 1 });
  assert.deepEqual(log, []);
  root.flush();
  root.render(h(Subscription, { room: "B" }));
  root.flush();
  root.render(null);
  root.flush();
  assert.deepEqual(log, [
    "connect A",
    "disconnect A",
    "connect B",
    "disconnect B",
  ]);
});

test("显式工作单元留下 begin/complete 轨迹", () => {
  const root = createRoot();
  root.render(h("main", null, h("b", null, "B"), h("i", null, "I")));
  const { trace } = root.flush();
  assert.ok(trace.indexOf("begin Host") < trace.indexOf("complete Host"));
  assert.equal(trace.at(-1), "commit root");
});

test("Context 从最近的 Provider 读取，而不是全局单例", () => {
  const Theme = createContext("default");
  function Label() {
    return h("span", null, useContext(Theme));
  }
  const root = createRoot();
  root.render(h(Theme.Provider, { value: "dark" }, h(Label)));
  root.flush();
  assert.equal(root.snapshot()[0].children[0].text, "dark");
  root.render(h(Label));
  root.flush();
  assert.equal(root.snapshot()[0].children[0].text, "default");
});

test("简化 Suspense 先提交 fallback，资源完成后重试主内容", async () => {
  let resolve;
  const resource = createResource(new Promise((done) => (resolve = done)));
  function Data() {
    return h("strong", null, readResource(resource));
  }
  const root = createRoot();
  root.render(h(SUSPENSE, { fallback: h("em", null, "waiting") }, h(Data)));
  assert.match(root.flush().trace.join(" "), /suspend → fallback/);
  assert.equal(root.snapshot()[0].children[0].text, "waiting");
  resolve("ready");
  await Promise.resolve();
  await Promise.resolve();
  root.flush({ lane: TransitionLane });
  assert.equal(root.snapshot()[0].children[0].text, "ready");
});

test("fallback 自身挂起时不能被同一边界无限捕获", () => {
  const resource = createResource(new Promise(() => {}));
  function Pending() {
    readResource(resource);
    return h("p");
  }
  const root = createRoot();
  root.render(h(SUSPENSE, { fallback: h(Pending) }, h(Pending)));
  assert.throws(() => root.flush(), /缺少可捕获的 Suspense 边界/);
  assert.deepEqual(root.snapshot(), []);
});
