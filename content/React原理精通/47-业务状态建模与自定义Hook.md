# 47. 真实应用中的状态建模与自定义 Hook

> 源码学习不能只会解释 `useState` 内部，还要能决定**哪些数据值得成为 state、谁拥有它、什么时候同步外部系统**。本章补上从 React 用户模型到企业应用设计之间的一层。公共 API 语义以 [React 官方状态管理教程](https://react.dev/learn/managing-state) 与 [Escape Hatches](https://react.dev/learn/escape-hatches) 为准；内部定位固定 React v19.3.0。

## 学习目标

给一个新页面，能画出状态所有权与数据流，删除冗余 state，正确选择事件处理器、Render 计算、Effect、Context 或外部 Store。能解释自定义 Hook 如何复用逻辑，以及为什么它不会自动让两个组件共享同一份本地状态。

## 1. 先从 UI 的最小状态集合开始

假设商品列表有 `products`、搜索文字 `query`、是否只看有货 `inStockOnly` 和过滤后结果。前三个值可能是输入或外部数据；`visibleProducts` 可由前三者计算，不应再存一份独立 state：

```tsx
import { useState } from 'react';

type Product = { id: string; name: string; inStock: boolean };

function ProductList({ products }: { products: Product[] }) {
  const [query, setQuery] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const visibleProducts = products.filter(product =>
    product.name.includes(query) && (!inStockOnly || product.inStock)
  );
  return <>
    <label>搜索商品 <input value={query} onChange={e => setQuery(e.target.value)} /></label>
    <label><input type="checkbox" checked={inStockOnly} onChange={e => setInStockOnly(e.target.checked)} />只看有货</label>
    <ul>{visibleProducts.map(product => <li key={product.id}>{product.name}</li>)}</ul>
  </>;
}
```

若另存 `visibleProducts`，就要回答“输入改变后，什么时候把过滤结果同步进去”。一个 `useEffect` 再 `setVisibleProducts` 会引入额外 Render，并出现短暂的旧结果。这里直接在 Render 中计算更符合单一数据来源。若计算很慢，先测量；再考虑缓存或调整列表更新优先级，不能把 `useMemo` 当成纠正状态模型的工具。

## 2. 决定 state 放在哪里

画一棵组件树：

```text
ShopPage
├─ SearchBar        读写 query
├─ ProductList      读取 query 与 products
└─ CartSummary      读取 cart
```

`query` 的最近共同使用者是 `ShopPage`，可以放在那里并向下传值与事件回调。若 `CartSummary` 与多个远处页面都需要购物车，再考虑 Context 或外部 Store；不要因为“props 传两层”就立刻引入全局状态。Context 解决跨层传值，仍需认真选择 Provider value 的身份与变化范围。[readContext](source:packages/react-reconciler/src/ReactFiberNewContext.js#readContext) 展示消费端如何读取并记录依赖。

这里有三个判断问题：

1. 这个值会随用户或外部事件改变吗？不变则可能只是 props/常量。
2. 能否从现有 props/state 计算？能则通常不应再保存副本。
3. 谁需要读取和修改？把所有权放在能覆盖这些消费者的最窄位置。

## 3. 事件、Render、Effect 各做什么

```text
点击“加入购物车” → 事件处理器：发出这次明确的业务意图
cart state 更新 → Render：计算数量、金额与 JSX
外部订阅变化 → Effect：建立/清理订阅，或使用专用外部 Store 协议
```

不要把“点击后保存订单”放进一个观察 `cart` 变化的 Effect：页面刷新、恢复状态或 StrictMode 检查可能让这个 Effect 在你没点击时也运行。事件特有逻辑留在事件处理器；与外部系统保持同步的持续关系才进入 Effect。把 [mountState](source:packages/react-reconciler/src/ReactFiberHooks.js#mountState) 与 [dispatchSetState](source:packages/react-reconciler/src/ReactFiberHooks.js#dispatchSetState) 连起来看：setter 只是入队更新，不会修改当前事件处理器中的局部变量。

## 4. 自定义 Hook 复用逻辑，不自动共享 state

```tsx
import { useState } from 'react';

function useDisclosure() {
  const [open, setOpen] = useState(false);
  return { open, show: () => setOpen(true), hide: () => setOpen(false) };
}

function DisclosureDemo() {
  const menu = useDisclosure();
  const dialog = useDisclosure();
  return <>
    <button onClick={menu.show}>打开菜单</button>
    <button onClick={dialog.show}>打开对话框</button>
    <p>菜单：{menu.open ? '开' : '关'}；对话框：{dialog.open ? '开' : '关'}</p>
  </>;
}
```

每次调用自定义 Hook，本质上是在当前组件的 Hook 链上继续调用内置 Hook。例子中的两次调用分别创建状态节点；改成两个子组件各调用一次时，状态节点则分别属于各自的 Fiber，都不会共享同一个 `open`。若确实要共享，先把状态上移并传下去；跨树共享时再评估 Context 或 `useSyncExternalStore`。这就是“复用逻辑”和“共享数据”两种不同需求。对应源码可看 [renderWithHooks](source:packages/react-reconciler/src/ReactFiberHooks.js#renderWithHooks) 中 Dispatcher 如何服务当前 Fiber。

## 5. 动手实验：先预测再改造

写一个父组件含两个独立的 `useDisclosure` 消费者。先预测点击 Menu 按钮后 Dialog 会不会打开；运行后确认不会。然后把 `open` 上移到父组件再试。接着为商品过滤例子做两版：A 版用 Effect 保存 `visibleProducts`，B 版在 Render 中派生；记录输入后的 Render 次数和是否出现短暂旧列表。性能结论只针对你的实验配置，不要把开发模式的额外调用当成生产环境次数。

## 自检

1. `products` 和 `query` 已有，为什么再建一个 `visibleProducts` state 通常是坏主意？如果过滤很慢，该先做什么？
2. `Menu` 和 `Dialog` 分别调用 `useDisclosure()`，为什么状态不共享？若产品要求两处同步，先给出最小改法，再说明什么时候需要外部 Store。
3. “用户点击付款”与“连接 WebSocket 房间”各应优先放在事件处理器还是 Effect？为什么？

## 参考答案

1. `visibleProducts` 可由已有输入计算，保存副本会制造两个真值，并要求额外同步；Effect 更新会产生额外 Render。先用真实输入测量瓶颈，再考虑算法、数据量、缓存或非紧急更新，不靠冗余 state 解决慢计算。
2. 每个组件有自己的 Fiber 和 Hook 链，两个调用分别创建状态节点。最小改法是把 `open` 上移到共同父组件，传给两处；若多个不相关子树读写同一外部可变源，才评估外部 Store 与一致性协议。
3. 付款由一次明确点击触发，放在事件处理器；WebSocket 连接是需要随 `roomId` 建立并清理的持续外部关系，放在 Effect（或封装该同步关系的自定义 Hook）。付款请求放到 Effect 会让“渲染/恢复状态”与“用户授权购买”混淆。

## 延伸阅读

[Thinking in React](https://react.dev/learn/thinking-in-react) 用最小状态与数据流构建 UI；[You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect) 解释何时直接计算；继续读 [Context](11-Context原理.md) 与 [External Store/Tearing](21-useSyncExternalStore与Tearing.md)。
