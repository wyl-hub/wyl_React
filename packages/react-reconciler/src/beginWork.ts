import { ReactElement } from "shared/ReactTypes"
import { FiberNode } from "./fiber"
import { UpdateQueue, processUpdateQueue } from "./updateQueue"
import {
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
} from "./workTags"
import { reconcileChildFibers, mountChildFibers } from "./childFibers"
import { renderWithHooks } from "./fiberHooks"

// 计算该节点的最新值  and 创建 子 fiberNode
export function beginWork(wip: FiberNode) {
  console.log("begin work")
  switch (wip.tag) {
    case HostRoot:
      return updateHostRoot(wip)
    case HostComponent:
      return updateHostComponent(wip)
    case HostText:
      return null
    case FunctionComponent:
      return updateFunctionComponent(wip)
    default:
      console.warn("beginwork 未实现的类型", wip.tag)
      break
  }
  return null
}

function updateHostRoot(wip: FiberNode) {
  const baseState = wip.memoizedState
  const updateQueue = wip.updateQueue as UpdateQueue<Element>
  const pending = updateQueue.shared.pending
  // 重置更新
  updateQueue.shared.pending = null
  const { memoizedState } = processUpdateQueue(baseState, pending)
  wip.memoizedState = memoizedState

  const nextChildren = wip.memoizedState
  reconcileChilren(wip, nextChildren)

  return wip.child
}

function updateHostComponent(wip: FiberNode) {
  const nextProps = wip.pendingProps
  const nextChildren = nextProps.children
  reconcileChilren(wip, nextChildren)

  return wip.child
}

function updateFunctionComponent(wip: FiberNode) {
  // 函数组件  构建该函数组件fiber的hooks链表  （mount 和 update 时 hooks方法的不同实现）
  // 并执行该函数  获取 UI
  const nextChildren = renderWithHooks(wip)
  reconcileChilren(wip, nextChildren)

  return wip.child
}

function reconcileChilren(wip: FiberNode, children?: ReactElement) {
  // 根据对应的上一颗fiber树 构建对应的新的fiber树  （双缓存）
  const current = wip.alternate
  if (current !== null) {
    // update
    wip.child = reconcileChildFibers(wip, current?.child, children)
  } else {
    // mount (插入大量DOM 可以一回插入 不用要细节一个一个插入) 不追踪副作用
    wip.child = mountChildFibers(wip, null, children)
  }
}
