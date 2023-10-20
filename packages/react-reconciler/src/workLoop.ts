import { FiberNode, FiberRootNode, createWorkInProgress } from "./fiber"
import { beginWork } from "./beginWork"
import { completeWork } from "./completeWork"
import { HostRoot } from "./workTags"
import { MutationMask, NoFlags } from "./fiberFlags"
import { commitMutationEffects } from "./commitWork"
let workInProgress: FiberNode | null = null

function prepareFreshStack(root: FiberRootNode) {
  workInProgress = createWorkInProgress(root.current, {})
}

export function scheduleUpdateOnFiber(fiber: FiberNode) {
  // 调度功能
  // 获取fiberRootNode
  const root = markUpdateFromFiberToRoot(fiber)
  renderRoot(root)
}

function markUpdateFromFiberToRoot(fiber: FiberNode) {
  let node = fiber
  let parent = fiber.return
  while (parent !== null) {
    node = parent
    parent = node.return
  }
  if (node.tag === HostRoot) {
    return node.stateNode
  }
  return null
}

function renderRoot(root: FiberRootNode) {
  // 创建 调度 开始的 workInProgress
  prepareFreshStack(root)
  do {
    try {
      workLoop()
      break
    } catch (e) {
      console.warn("workLoop 发生错误", e)
      workInProgress = null
    }
  } while (true)

  const finishedWork = root.current.alternate
  root.finishedWork = finishedWork

  // wip fiberNode 树  中的flags
  commitRoot(root)
}

function commitRoot(root: FiberRootNode) {
  const finishedWork = root.finishedWork

  if (finishedWork === null) return

  // 重置
  root.finishedWork = null

  // 判断是否存在3个阶段需要执行的操作
  // root flags  subtreeFlags
  const subtreeHasEffect =
    (finishedWork.subtreeFlags & MutationMask) !== NoFlags
  const rootHasEffect = (finishedWork.subtreeFlags & MutationMask) !== NoFlags

  if (subtreeHasEffect || rootHasEffect) {
    // beforeMutation
    // mutation
    commitMutationEffects(finishedWork)
    // layout
    root.current = finishedWork
  } else {
    root.current = finishedWork
  }
}

function workLoop() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress)
  }
}

function performUnitOfWork(fiber: FiberNode) {
  // 从头 至尾  构建每一个节点的fiber节点 并计算最新属性
  const next = beginWork(fiber)
  fiber.memoizedProps = fiber.pendingProps
  
  if (next === null) {
    // 完成该节点 创建该fiber的DOM节点 并构建一条 离屏DOM树
    // 完成该节点后 继续创建该节点的兄弟节点 若已不存在兄弟节点 向上回溯
    completeUnitOfWork(fiber)
  } else {
    workInProgress = next
  }
}

function completeUnitOfWork(fiber: FiberNode) {
  let node: FiberNode | null = fiber

  do {
    completeWork(node)
    const sibling = node.sibling
    if (sibling !== null) {
      workInProgress = sibling
      return
    }
    node = node.return
    workInProgress = node
  } while (node !== null)
}
