# Lab 09：最小 Custom Renderer

## 目标

把 React 与 React DOM 彻底分开。

## 任务

实现一个输出 JSON 树的 Renderer：

```jsx
<App>
  <box id="a">hello</box>
</App>
```

最终不是 DOM，而是：

```js
{ type: 'box', props: {id: 'a'}, children: ['hello'] }
```

## 需要实现/理解的 Host Config 能力

```text
createInstance
createTextInstance
appendInitialChild
appendChild
insertBefore
removeChild
commitUpdate
prepareUpdate / mutation-related hooks（以所用 reconciler 版本为准）
```

## 验收

当你的 renderer 能运行 Function Component + useState，并能更新 JSON host tree 时，你应该能明确说出：

> Fiber/Reconciliation 是 React Core；DOM 只是一个 Host Environment。
