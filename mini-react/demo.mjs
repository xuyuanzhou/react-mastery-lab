import {
  createElement as h,
  createRoot,
  useState,
  SyncLane,
  TransitionLane,
} from "./src/index.mjs";

let setCount;
function Counter() {
  const [count, dispatch] = useState(1);
  setCount = dispatch;
  return h("output", { title: "current state" }, count);
}

const root = createRoot();
function show(stage, result) {
  console.log(`${stage}:`, JSON.stringify(root.snapshot(), null, 2));
  console.log("执行轨迹:", result.trace.join(" → "));
}
root.render(h(Counter));
show("Mount (1)", root.flush());
setCount((n) => n + 10, TransitionLane);
setCount((n) => n * 2, SyncLane);
show("Sync (2)", root.flush({ lane: SyncLane }));
show("Transition replay (22)", root.flush({ lane: TransitionLane }));
