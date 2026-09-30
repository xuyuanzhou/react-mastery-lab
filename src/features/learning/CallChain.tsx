import { ArrowRight, Route } from "lucide-react";
import { chain, type SourceTarget } from "./model";

export default function CallChain({
  open,
}: {
  open: (target: SourceTarget) => void;
}) {
  return (
    <section className="chain-card">
      <div className="section-label">
        <Route size={16} /> 源码主线 <small>点击函数，直接定位</small>
      </div>
      <div className="call-chain">
        {chain.map(([symbol, path], index) => (
          <span key={symbol}>
            <button onClick={() => open({ path: "packages/" + path, symbol })}>
              <small>{String(index + 1).padStart(2, "0")}</small>
              {symbol}
            </button>
            {index < chain.length - 1 && <ArrowRight size={13} />}
          </span>
        ))}
      </div>
      <p>
        概念执行路径，跨越调度边界；createRoot 创建根，随后 root.render
        才提交元素更新，并非这些函数直接依次调用。
      </p>
    </section>
  );
}
