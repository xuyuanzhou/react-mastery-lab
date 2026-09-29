# Lab 06：Suspense、Thenable Tracking、Ping 与 Retry

## 目标

理解现代 React Suspense 不是简单的 `throw Promise` 教程模型。

## Demo

使用一个可控 thenable 或支持 Suspense 的数据源，让组件第一次读取时 pending，随后手工 resolve。

## 断点

```text
trackUsedThenable / unwrapThenable（按当前源码实际入口）
getSuspendedThenable
throwException
attachPingListener
pingSuspendedRoot
retryTimedOutBoundary / retryDehydratedSuspenseBoundary（按场景）
```

## 观察

记录：

```text
thenable.status
suspendedThenable
workInProgressRootExitStatus
root.pingedLanes
boundary memoizedState
```

## 核心结论

在 React 19.3 的 `use()` 路径里，React 会跟踪真实 thenable，并用内部的 opaque `SuspenseException` 把控制流交给 WorkLoop；WorkLoop 再取回真正 thenable。不要把这个内部实现简化成“React 永远直接 throw Promise”。
