import { Link } from "react-router-dom";
import {
  Atom,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Code2,
  FlaskConical,
} from "lucide-react";
import chapters from "../generated/chapters.json";
import CallChain from "../features/learning/CallChain";
import type { SourceTarget } from "../features/learning/model";
import type { Progress } from "../features/progress/useProgress";
import { chapterUrl } from "./routes";

export default function HomePage({
  progress,
  onOpenSource,
}: {
  progress: Progress;
  onOpenSource: (target: SourceTarget) => void;
}) {
  return (
    <>
      <section className="welcome">
        <div>
          <div className="eyebrow">
            <span className="status-dot" /> YOUR REACT LEARNING JOURNEY
          </div>
          <h1>
            读懂原理。
            <br />
            沿着源码，走得更深。
          </h1>
          <p>
            从写出第一个组件，到读懂一次更新如何抵达屏幕。
            <br />
            阅读、追踪、实验，在同一个学习空间完成。
          </p>
          <Link
            className="primary"
            to={chapterUrl(
              progress.recent.find((id) => chapters.some((c) => c.id === id)) ||
                chapters[0]?.id ||
                "",
            )}
          >
            {progress.recent.length ? "继续学习" : "开始第一课"}
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="react-orbit">
          <Atom />
          <span>
            REACT
            <br />
            <b>19.3</b>
          </span>
          <i className="orbit-dot" />
        </div>
      </section>
      <div className="stats">
        <div>
          <BookOpen size={18} />
          <span>
            <b>{chapters.length}</b> 学习章节
          </span>
        </div>
        <div>
          <FlaskConical size={18} />
          <span>
            <b>8</b> 交互实验
          </span>
        </div>
        <div>
          <Code2 size={18} />
          <span>
            固定源码 <b>v19.3.0</b>
          </span>
        </div>
      </div>
      <div className="section-heading">
        <h2>先掌握 React 基础</h2>
        <span>从使用者出发，再进入源码</span>
      </div>
      <div className="roadmap">
        {[
          ["01", "React 入门", "组件 · JSX · 样式 · 纯渲染", "basicsStart"],
          ["02", "组件与交互", "Props · 事件 · State · 表单", "basicsUi"],
          [
            "03",
            "Hooks 与状态",
            "Effect · Ref · Context · 自定义 Hook",
            "basicsHooks",
          ],
          [
            "04",
            "工程实践",
            "路由 · TypeScript · 测试 · 可访问性",
            "basicsEngineering",
          ],
        ].map(([n, title, desc, group]) => (
          <Link
            key={group}
            to={chapterUrl(
              chapters.find((chapter) => chapter.group === group)?.id ??
                chapters[0].id,
            )}
          >
            <span className="roadmap-number">{n}</span>
            <div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
            <ArrowUpRight size={18} />
          </Link>
        ))}
      </div>
      <div className="section-heading">
        <h2>进入源码主线，按能力前进</h2>
        <Link to={chapterUrl("React原理精通/课程路线-能力里程碑.md")}>
          查看完整学习路线 <ArrowUpRight size={13} />
        </Link>
      </div>
      <div className="roadmap">
        {[
          [
            "01",
            "建立学习起点",
            "JavaScript · 浏览器 · JSX · 源码阅读",
            "start",
          ],
          [
            "02",
            "理解 React 运行时",
            "Element · Fiber · WorkLoop · Commit",
            "runtime",
          ],
          [
            "03",
            "掌握 Hooks 与状态",
            "Dispatcher · Queue · Effect · Context",
            "hooks",
          ],
          [
            "04",
            "理解调度与并发",
            "Lane · Scheduler · Transition",
            "concurrency",
          ],
          ["05", "连接浏览器运行时", "Event · DOM · Layout · Paint", "browser"],
          [
            "06",
            "进入服务端模型",
            "Suspense · SSR · Hydration · RSC",
            "server",
          ],
          [
            "07",
            "上升到架构层",
            "Compiler · Renderer · 性能工程",
            "architecture",
          ],
          [
            "08",
            "源码阅读与验收",
            "Debug · Labs · Mini React · Assessments",
            "practice",
          ],
        ].map(([n, title, desc, g]) => (
          <Link
            key={n}
            to={chapterUrl(
              chapters.find((c) => c.group === g)?.id || chapters[0].id,
            )}
          >
            <span className="roadmap-number">{n}</span>
            <div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
            <ArrowUpRight size={18} />
          </Link>
        ))}
      </div>
      <CallChain open={onOpenSource} />
      <div className="section-heading">
        <h2>学习这个工程</h2>
        <span>从入口、功能模块到质量检查与部署</span>
      </div>
      <div className="lab-preview">
        <div>
          <h3>把源码学习器当作真实 React 项目来读</h3>
          <p>打开工程实践课程，再将右侧面板切换到「本项目源码」。</p>
        </div>
        <Link
          to={chapterUrl(
            chapters.find((c) => c.group === "engineering")?.id ?? "",
          )}
          className="round-link"
          aria-label="进入工程实践"
        >
          <ArrowUpRight />
        </Link>
      </div>
      <div className="lab-preview">
        <div>
          <h3>阅读可运行的 Mini React 源码</h3>
          <p>从 Element、Fiber 和 Hook 队列出发，对照测试与官方实现。</p>
        </div>
        <Link
          to={chapterUrl("React原理精通/mini-react/README.md")}
          className="round-link"
          aria-label="进入 Mini React 源码课"
        >
          <ArrowUpRight />
        </Link>
      </div>
      <div className="section-heading">
        <h2>在实验中建立直觉</h2>
        <Link to="/labs">
          进入实验室 <ArrowRight size={14} />
        </Link>
      </div>
      <div className="lab-preview">
        <div>
          <div className="mini-nodes">
            <span>current</span>
            <i>⇄</i>
            <span>WIP</span>
          </div>
          <h3>同一个界面，两棵工作树</h3>
          <p>观察 render 如何准备，commit 如何切换。</p>
        </div>
        <Link to="/labs" className="round-link" aria-label="进入 Fiber 实验">
          <ArrowUpRight />
        </Link>
      </div>
      <p className="content-notice">
        已完整接入 React 原理精通教材：
        {chapters.filter((chapter) => chapter.track === "mastery").length}{" "}
        篇主教材 + 28 篇快速导学 + 4
        篇工程实践。按能力里程碑学习，没有毕业时限；源码基线固定为 React
        v19.3.0。
        <Link to={chapterUrl("React原理精通/49-如何贡献新章节.md")}>
          添加或扩展章节
        </Link>
      </p>
    </>
  );
}
