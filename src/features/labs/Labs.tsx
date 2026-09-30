import { useState } from "react";
import { ArrowRight, Play, RotateCcw, FlaskConical } from "lucide-react";
import { keyedDiff, rebase } from "./simulation.mjs";
const tabs = [
  "Fiber 双树",
  "Hooks 链表",
  "UpdateQueue",
  "Lane 位运算",
  "Effect 时序",
  "Diff / key",
  "Render / Commit",
  "浏览器 Pipeline",
];
const steps = [
  [
    "current 是已提交的界面；WIP 还没有开始。",
    "克隆或复用 alternate，生成 workInProgress。current 仍然是屏幕上的版本。",
    "在 WIP 上完成状态计算与子树协调。此时不能把 WIP 当成已提交结果。",
    "Commit 应用 DOM 变化，root.current 指向完成的树。两棵树的角色交换。",
  ],
  [
    "第一次调用 useState：分配 Hook 1。",
    "第二次调用 useRef：Hook 1.next 指向 Hook 2。",
    "第三次调用 useEffect：Hook 2.next 指向 Hook 3。",
    "更新时沿旧链表按调用顺序读取；变量名称不能识别 Hook。",
  ],
  [
    "初始状态 1。按顺序入队：Transition +10，然后 Sync ×2。",
    "本次只处理 Sync：跳过 +10，执行 ×2，界面得到 2。",
    "baseState 保留 1；baseQueue 保留 +10，以及 lane=0 的 ×2 克隆。",
    "处理 Transition 时从 1 重放：先 +10 再 ×2，结果是 22，不是 12。",
  ],
  ["选择通道观察集合的并、交和最低置位。"],
  [
    "Render 只计算：这里不执行 useEffect 的 setup。",
    "Mutation：应用 DOM 变化；更新中 layout cleanup 在相应提交步骤发生。",
    "Layout：执行 layout setup，可能读取布局并阻塞浏览器绘制。",
    "Passive：刷新 useEffect 的 cleanup，再运行新的 setup。它不保证总在 paint 之后。",
  ],
  ["对比旧、新 key 序列。下面显示简化的 lastPlacedIndex 决策。"],
  [
    "schedule：把更新加入队列，安排 Root 工作。",
    "beginWork：向下处理组件与子节点。",
    "completeWork：向上归并 flags，准备宿主节点。",
    "Commit：应用完成的工作。被中断而丢弃的 Render 不会进入这一步。",
  ],
  [
    "JavaScript 修改 DOM 或样式。",
    "Style：计算元素最终采用的 CSS。",
    "Layout：计算位置与大小；某些修改可以跳过这一步。",
    "Paint：生成绘制内容。",
    "Composite：合成图层并呈现。具体是否独立成层由浏览器决定。",
  ],
];
export default function Labs() {
  const [tab, setTab] = useState(0),
    [step, setStep] = useState(0),
    [lanes, setLanes] = useState(5),
    [swap, setSwap] = useState(false),
    [conditional, setConditional] = useState(false);
  const queue = [
    { kind: "add", value: 10, lane: 2 },
    { kind: "multiply", value: 2, lane: 1 },
  ];
  const first = rebase(1, queue, 1),
    final = rebase(first.baseState, first.baseQueue, 2);
  const diff = keyedDiff(
    ["A", "B", "C"],
    swap ? ["C", "A", "B"] : ["A", "B", "C"],
  );
  return (
    <div className="lab">
      <div className="eyebrow">
        <FlaskConical size={15} /> INTERACTIVE LAB
      </div>
      <h1>把抽象机制，变成可观察的状态。</h1>
      <p className="muted">
        教学模型：用于解释关键不变量，不是 React 运行时或性能测量。
      </p>
      <div className="lab-tabs">
        {tabs.map((name, i) => (
          <button
            key={name}
            className={tab === i ? "active" : ""}
            onClick={() => {
              setTab(i);
              setStep(0);
            }}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="experiment">
        <div className="experiment-title">
          <h2>{tabs[tab]}</h2>
          <span className="badge">
            STEP {step + 1} / {steps[tab].length}
          </span>
        </div>
        {tab === 0 && (
          <div className="dual-trees">
            {["current", "workInProgress"].map((name, i) => (
              <div
                className={
                  "tree " +
                  (step === 3
                    ? i === 1
                      ? "emphasis"
                      : ""
                    : i === 0
                      ? "emphasis"
                      : "")
                }
                key={name}
              >
                <h3>
                  {step === 3
                    ? i === 1
                      ? "current（原 WIP）"
                      : "alternate（原 current）"
                    : name}
                </h3>
                <div className="node">HostRoot</div>
                <div className="branch">↓</div>
                <div className="node">
                  App <small>state = {i === 1 && step >= 2 ? 1 : 0}</small>
                </div>
                <div className="branch">↙ ↘</div>
                <div className="siblings">
                  <div className="node">Counter</div>
                  <div className="node">Button</div>
                </div>
                {i === 1 && step === 0 && <p>尚未准备</p>}
              </div>
            ))}
            <span className="alternate-label">⇄ alternate</span>
          </div>
        )}
        {tab === 1 && (
          <>
            <button onClick={() => setConditional(!conditional)}>
              {conditional ? "恢复正确调用顺序" : "模拟 if 条件跳过 useRef"}
            </button>
            <div className="flow">
              {[
                "useState → 0",
                conditional
                  ? "useEffect → 错读 Hook 2"
                  : "useRef → {current:null}",
                "useEffect → effect",
              ]
                .slice(0, step + 1)
                .map((s, i) => (
                  <div
                    className={
                      "node " + (conditional && i === 1 ? "danger" : "")
                    }
                    key={i}
                  >
                    <small>Hook {i + 1}</small>
                    {s}
                    <span>next →</span>
                  </div>
                ))}
            </div>
            {conditional && (
              <p className="error">
                更新时跳过常规 Hook 会使链表顺序错位。不要在条件中调用
                useState/useRef/useEffect。use API 有不同规则。
              </p>
            )}
          </>
        )}
        {tab === 2 && (
          <>
            <div className="flow">
              <div className="node">
                初始状态<b>1</b>
              </div>
              <ArrowRight />
              <div className="node">Transition +10</div>
              <ArrowRight />
              <div className="node">Sync ×2</div>
            </div>
            <div className="state-grid">
              <div>
                memoizedState
                <strong>
                  {step === 0
                    ? 1
                    : step === 3
                      ? final.memoizedState
                      : first.memoizedState}
                </strong>
              </div>
              <div>
                baseState
                <strong>
                  {step === 0
                    ? 1
                    : step === 3
                      ? final.baseState
                      : first.baseState}
                </strong>
              </div>
              <div>
                baseQueue
                <strong>
                  {step === 0 ? "空" : step === 3 ? "空" : "+10 → ×2"}
                </strong>
              </div>
            </div>
            <pre>
              {JSON.stringify(
                step === 3 ? final : step === 0 ? { pending: queue } : first,
                null,
                2,
              )}
            </pre>
          </>
        )}
        {tab === 3 && (
          <>
            <div className="lane-controls">
              {["Sync（示意）", "Transition（示意）", "Idle（示意）"].map(
                (s, i) => (
                  <label key={s}>
                    <input
                      type="checkbox"
                      checked={!!(lanes & (1 << i))}
                      onChange={() => setLanes(lanes ^ (1 << i))}
                    />
                    {s}
                  </label>
                ),
              )}
            </div>
            <div className="bits">
              {lanes
                .toString(2)
                .padStart(3, "0")
                .split("")
                .map((b, i) => (
                  <span key={i} className={b === "1" ? "on" : ""}>
                    {b}
                  </span>
                ))}
            </div>
            <pre>{`selected = ${lanes}\nselected & 001 = ${lanes & 1}\nselected | 010 = ${lanes | 2}\nselected & -selected = ${lanes & -lanes}`}</pre>
            <p>
              这里用 3 位便于学习，不代表 v19.3.0 的真实 Lane
              常量。最低置位表达集合中最右侧通道，不代表整个调度算法。
            </p>
          </>
        )}
        {tab === 4 && (
          <div className="timeline">
            {["Render", "Mutation", "Layout", "Passive"].map((s, i) => (
              <div key={s} className={i <= step ? "lit" : ""}>
                <span>{i + 1}</span>
                <h3>{s}</h3>
                <p>
                  {
                    [
                      "计算 JSX",
                      "DOM / cleanup",
                      "layout setup",
                      "passive cleanup → setup",
                    ][i]
                  }
                </p>
              </div>
            ))}
          </div>
        )}
        {tab === 5 && (
          <>
            <button className="primary" onClick={() => setSwap(!swap)}>
              切换顺序：{swap ? "还原 A B C" : "变为 C A B"}
            </button>
            <div className="flow">
              {diff.map((d) => (
                <div
                  className={"node " + (d.action === "移动" ? "emphasis" : "")}
                  key={d.key}
                >
                  <b>{d.key}</b>
                  <small>
                    旧位置 {d.oldIndex} → 新位置 {d.index}
                  </small>
                  {d.action}
                  <small>lastPlacedIndex = {d.lastPlacedIndex}</small>
                </div>
              ))}
            </div>
            <p>
              key
              标识同级身份，类型相同才可复用。位置变化不一定都生成移动标记；key
              变化则通常意味着重新创建状态。
            </p>
          </>
        )}
        {tab === 6 && (
          <div className="timeline">
            {["Schedule", "beginWork ↓", "completeWork ↑", "Commit"].map(
              (s, i) => (
                <div className={i <= step ? "lit" : ""} key={s}>
                  <span>{i + 1}</span>
                  <h3>{s}</h3>
                  <p>{i === 3 ? "DOM 发生变化" : "DOM 保持已提交版本"}</p>
                </div>
              ),
            )}
          </div>
        )}
        {tab === 7 && (
          <div className="pipeline">
            {["DOM", "Style", "Layout", "Paint", "Composite"].map((s, i) => (
              <div key={s} className={"node " + (i === step ? "emphasis" : "")}>
                {s}
                <small>
                  {i < step ? "已处理" : i === step ? "当前步骤" : "等待"}
                </small>
              </div>
            ))}
          </div>
        )}
        <div className="explanation">
          <span>观察</span>
          <p>{steps[tab][step]}</p>
        </div>
        <div className="lab-controls">
          <button disabled={step === 0} onClick={() => setStep(step - 1)}>
            上一步
          </button>
          <button
            className="primary"
            disabled={step === steps[tab].length - 1}
            onClick={() => setStep(step + 1)}
          >
            <Play size={14} />
            下一步
          </button>
          <button
            onClick={() => {
              setStep(0);
              setSwap(false);
              setLanes(5);
              setConditional(false);
            }}
          >
            <RotateCcw size={14} />
            重置
          </button>
        </div>
      </div>
      <div className="note">
        <b>先预测，再操作</b>
        <p>
          每一步先写下你预测的状态，再点击下一步。随后打开右侧源码，确认教学模型省略了哪些分支。
        </p>
      </div>
    </div>
  );
}
